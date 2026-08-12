import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { haptic, usePreferences } from "@/hooks/useAppSettings";

export const Route = createFileRoute("/templates/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Modèle Grok — Utiliser ce modèle" },
      { name: "description", content: "Découvrez le modèle, importez votre photo et lancez la génération." },
      { property: "og:title", content: "Modèle Grok" },
      { property: "og:description", content: "Importez votre photo et utilisez ce modèle Grok." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplateDetail,
});

function TemplateDetail() {
  const { slug } = useParams({ from: "/templates/$slug" });
  const tpl = getTemplate(slug);
  const { prefs } = usePreferences();
  const [tab, setTab] = useState<"photo" | "edit" | "details">("photo");
  const [photo, setPhoto] = useState<string | null>(null);

  if (!tpl) {
    return (
      <main className="grid min-h-[100dvh] place-items-center gap-4 bg-background text-center">
        <div>
          <p className="text-lg">Modèle introuvable.</p>
          <Link to="/" className="text-muted-foreground underline">
            Retour au studio
          </Link>
        </div>
      </main>
    );
  }

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    haptic(prefs.haptics);
  };

  return (
    <main className="min-h-[100dvh] bg-background pb-32">
      <div className="relative">
        <img
          src={tpl.img}
          alt={tpl.title}
          width={512}
          height={768}
          className="animate-ken-burns h-[46dvh] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/40" />
        <Link
          to="/"
          aria-label="Retour"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="absolute inset-x-5 bottom-4">
          <span className="pill inline-flex items-center gap-2 px-3 py-1 text-xs text-foreground">
            {tpl.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {tpl.kind === "video" ? "Vidéo" : "Image"}
          </span>
          <h1 className="mt-2 text-3xl font-semibold">{tpl.title}</h1>
          <p className="mt-1 text-muted-foreground">{tpl.description}</p>
        </div>
      </div>

      <div className="mt-4 px-4">
        <div className="pill flex p-1 text-sm">
          {(
            [
              ["photo", "Votre photo"],
              ["edit", "Édition"],
              ["details", "Détails"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-4 py-2 transition ${
                tab === k ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "photo" ? (
            <label className="grok-card flex aspect-[3/4] max-h-[42dvh] cursor-pointer items-center justify-center overflow-hidden border border-dashed border-border">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              {photo ? (
                <img src={photo} alt="Votre photo" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-muted-foreground">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                    <Plus className="h-6 w-6" />
                  </span>
                  Ajouter une photo
                </span>
              )}
            </label>
          ) : null}

          {tab === "edit" ? (
            <textarea
              rows={5}
              placeholder="Décrivez les modifications souhaitées…"
              className="grok-card w-full resize-none p-4 text-base outline-none placeholder:text-muted-foreground"
            />
          ) : null}

          {tab === "details" ? (
            <ul className="grok-card divide-y divide-border">
              {tpl.details.map((d) => (
                <li key={d} className="px-4 py-3 text-sm">
                  {d}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <section className="mt-8 px-4">
        <h2 className="mb-3 text-lg font-semibold">Autres modèles</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {TEMPLATES.filter((t) => t.slug !== tpl.slug).map((t) => (
            <Link
              key={t.slug}
              to="/templates/$slug"
              params={{ slug: t.slug }}
              className="h-32 w-24 shrink-0 overflow-hidden rounded-xl"
            >
              <img src={t.img} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
            </Link>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent p-4 pt-8">
        <button
          onClick={() => {
            haptic(prefs.haptics);
            if (!photo) {
              toast.error("Ajoutez d'abord une photo.");
              return;
            }
            toast.success(`Modèle « ${tpl.title} » lancé.`);
          }}
          className="w-full rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground"
        >
          Utiliser ce modèle
        </button>
      </div>
    </main>
  );
}
