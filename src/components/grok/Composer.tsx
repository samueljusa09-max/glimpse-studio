import { useRef, useState } from "react";
import { Plus, Image as ImageIcon, Video, Smile, ArrowUp, X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { haptic, usePreferences, useFeatureFlags } from "@/hooks/useAppSettings";
import { generateMedia } from "@/lib/generation.functions";

export type ComposerMode = "image" | "video" | "sticker";

const RATIOS = ["2:3", "1:1", "3:2", "9:16"] as const;

export function Composer({
  mode,
  onModeChange,
}: {
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
}) {
  const { prefs } = usePreferences();
  const { isOn, loaded } = useFeatureFlags();
  const videoEnabled = !loaded || isOn("video_mode");
  const generate = useServerFn(generateMedia);

  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"speed" | "quality">("speed");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("2:3");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [duration, setDuration] = useState<6 | 10>(6);
  const [sound, setSound] = useState(true);

  const [reference, setReference] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tap = () => haptic(prefs.haptics);

  const pickFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisissez une image.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image trop lourde (max 6 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReference(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    tap();
    if (!prompt.trim()) {
      toast.error("Décrivez d'abord ce que vous voulez créer.");
      return;
    }
    setBusy(true);
    try {
      const res = await generate({
        data: {
          kind: mode,
          prompt: prompt.trim(),
          params:
            mode === "video"
              ? { ratio, quality, resolution, duration, sound }
              : { ratio, quality },
          ...(reference ? { referenceImage: reference } : {}),
        },
      });
      if (res.ok && res.url) {
        setResult(res.url);
        setPrompt("");
        setReference(null);
        toast.success("Création terminée");
      } else {
        toast.error(res.message ?? "Génération impossible");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {result ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95 p-4 backdrop-blur">
          <div className="flex justify-between">
            <button onClick={() => setResult(null)} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
              <X className="h-5 w-5" />
            </button>
            <a
              href={result}
              download
              className="flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm"
            >
              <Download className="h-4 w-4" /> Enregistrer
            </a>
          </div>
          <img src={result} alt="Création générée" className="my-auto max-h-[75vh] w-full rounded-2xl object-contain" />
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-6 pt-8">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-1">
          <div className="pill flex shrink-0 p-1 text-sm">
            {(["speed", "quality"] as const).map((q) => (
              <button
                key={q}
                onClick={() => {
                  tap();
                  setQuality(q);
                }}
                className={`rounded-full px-4 py-1.5 transition ${
                  quality === q ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {q === "speed" ? "Vitesse" : "Qualité"}
              </button>
            ))}
          </div>

          {mode === "video" ? (
            <>
              <div className="pill flex shrink-0 p-1 text-sm">
                {(["720p", "1080p"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      tap();
                      setResolution(r);
                    }}
                    className={`rounded-full px-4 py-1.5 transition ${
                      resolution === r ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="pill flex shrink-0 p-1 text-sm">
                {([6, 10] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      tap();
                      setDuration(d);
                    }}
                    className={`rounded-full px-4 py-1.5 transition ${
                      duration === d ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
              <div className="pill flex shrink-0 p-1 text-sm">
                {([true, false] as const).map((s) => (
                  <button
                    key={String(s)}
                    onClick={() => {
                      tap();
                      setSound(s);
                    }}
                    className={`rounded-full px-4 py-1.5 transition ${
                      sound === s ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s ? "Son" : "Muet"}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div className="pill flex shrink-0 p-1 text-sm">
            {RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  tap();
                  setRatio(r);
                }}
                className={`rounded-full px-3 py-1.5 transition ${
                  ratio === r ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grok-card p-3 shadow-[var(--shadow-float)]">
          {reference ? (
            <div className="mb-2 flex items-center gap-3 px-1">
              <img src={reference} alt="Aperçu de l'image ajoutée" className="h-16 w-16 rounded-lg object-cover" />
              <button
                onClick={() => setReference(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface"
                aria-label="Retirer l'image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder={
              mode === "video" ? "Décrivez la vidéo à créer (Généré par l'IA)" : "Que voulez-vous créer ?"
            }
            className="w-full bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button
              onClick={() => {
                tap();
                fileRef.current?.click();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface"
              aria-label="Ajouter une image"
            >
              <Plus className="h-5 w-5" />
            </button>
            <div className="pill flex items-center gap-1 p-1">
              <ModeChip
                active={mode === "image"}
                onClick={() => {
                  tap();
                  onModeChange("image");
                }}
                icon={<ImageIcon className="h-5 w-5" />}
                label="Image"
              />
              <ModeChip
                active={mode === "video"}
                onClick={() => {
                  tap();
                  if (!videoEnabled) {
                    toast.error("Le mode Vidéo est désactivé par l'administrateur.");
                    return;
                  }
                  onModeChange("video");
                }}
                icon={<Video className="h-5 w-5" />}
                label="Vidéo"
                disabled={!videoEnabled}
              />
              <ModeChip
                active={mode === "sticker"}
                onClick={() => {
                  tap();
                  onModeChange("sticker");
                }}
                icon={<Smile className="h-5 w-5" />}
                label="Sticker"
              />
            </div>
            <button
              onClick={() => void submit()}
              disabled={busy}
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-foreground disabled:opacity-60"
              aria-label="Envoyer"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "text-foreground"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {icon}
      {active ? label : null}
    </button>
  );
}
