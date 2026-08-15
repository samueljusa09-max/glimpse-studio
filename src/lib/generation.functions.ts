import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const genInput = z.object({
  kind: z.enum(["image", "sticker", "video"]),
  prompt: z.string().min(2).max(2000),
  params: z
    .object({
      ratio: z.string().max(10).optional(),
      quality: z.enum(["speed", "quality"]).optional(),
      resolution: z.string().max(10).optional(),
      duration: z.number().int().min(1).max(60).optional(),
      sound: z.boolean().optional(),
    })
    .default({}),
  /** Image de référence (data URL base64), optionnelle. */
  referenceImage: z.string().max(8_000_000).optional(),
});

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Génère une image (ou un sticker) et la stocke dans l'espace privé de l'utilisateur. */
export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => genInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: rowErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        kind: data.kind,
        prompt: data.prompt,
        params: data.params as never,
        status: "pending",
      })
      .select("id")
      .single();
    if (rowErr) throw new Error(rowErr.message);

    const fail = async (message: string) => {
      await supabase.from("generations").update({ status: "failed", error: message }).eq("id", row.id);
      return { ok: false as const, id: row.id, url: null, message };
    };

    if (data.kind === "video") {
      return fail(
        "La génération vidéo n'est pas encore activée sur votre compte. Votre demande a été enregistrée.",
      );
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fail("Le service de génération n'est pas configuré.");

    const ratio = data.params.ratio ?? "1:1";
    const styleHint =
      data.kind === "sticker"
        ? "Sticker autocollant, contour blanc épais, fond uni, style illustratif."
        : "Photographie détaillée, éclairage soigné.";

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: `${data.prompt}\n\nFormat ${ratio}. ${styleHint}` },
    ];
    if (data.referenceImage) {
      content.push({ type: "image_url", image_url: { url: data.referenceImage } });
    }

    let res: Response;
    try {
      res = await fetch(GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          modalities: ["image", "text"],
          messages: [{ role: "user", content }],
        }),
      });
    } catch {
      return fail("Service de génération injoignable.");
    }

    if (res.status === 429) return fail("Trop de demandes, réessayez dans un instant.");
    if (res.status === 402) return fail("Crédits IA épuisés.");
    if (!res.ok) return fail(`Erreur de génération (${res.status}).`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:")) return fail("Aucune image renvoyée par le modèle.");

    const base64 = dataUrl.split(",")[1] ?? "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${userId}/${row.id}.png`;

    const { error: upErr } = await supabase.storage
      .from("generations")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) return fail(upErr.message);

    await supabase.from("generations").update({ status: "done", storage_path: path }).eq("id", row.id);

    const { data: signed } = await supabase.storage.from("generations").createSignedUrl(path, 60 * 60 * 24);

    return { ok: true as const, id: row.id, url: signed?.signedUrl ?? null, message: null };
  });

/** Historique des créations de l'utilisateur, avec URL signées. */
export const listMyGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("generations")
      .select("id, kind, prompt, status, storage_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    const out: Array<{ id: string; kind: string; prompt: string; status: string; url: string | null }> = [];
    for (const g of data ?? []) {
      let url: string | null = null;
      if (g.storage_path) {
        const { data: signed } = await supabase.storage
          .from("generations")
          .createSignedUrl(g.storage_path, 60 * 60 * 24);
        url = signed?.signedUrl ?? null;
      }
      out.push({ id: g.id, kind: g.kind, prompt: g.prompt, status: g.status, url });
    }
    return out;
  });
