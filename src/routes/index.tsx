import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Image as ImageIcon, Video, Smile, ArrowUp, SlidersHorizontal, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GrokWordmark } from "@/components/grok/GrokLogo";
import tplPhotoEdit from "@/assets/tpl-photo-edit.jpg";
import tplReimagine from "@/assets/tpl-reimagine.jpg";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Grok — Studio de création IA" },
      {
        name: "description",
        content: "Animez vos photos, créez des images et des vidéos avec Grok.",
      },
      { property: "og:title", content: "Grok — Studio de création IA" },
      { property: "og:description", content: "Animez vos photos et créez des vidéos avec Grok." },
    ],
  }),
  component: Studio,
});

const ANIMATE = [
  "linear-gradient(135deg,#2b2b2b,#4a4a4a)",
  "linear-gradient(135deg,#1f2937,#374151)",
  "linear-gradient(135deg,#3f2b1d,#6b4a2f)",
  "linear-gradient(135deg,#12232e,#1f4b5c)",
  "linear-gradient(135deg,#2a1f36,#4b3763)",
  "linear-gradient(135deg,#241f1f,#463a3a)",
];

const TEMPLATES = [
  { title: "Photo Edit", img: tplPhotoEdit },
  { title: "Reimagine", img: tplReimagine },
];

function Studio() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"image" | "video" | "sticker">("image");

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  return (
    <main className="min-h-[100dvh] bg-background pb-40">
      <header className="flex items-center justify-between px-5 pt-6">
        <GrokWordmark />
        <Link
          to="/settings"
          aria-label="Paramètres"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Link>
      </header>

      <section className="mt-8">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-2xl font-semibold">Animez vos photos</h2>
          <button className="flex items-center gap-1 text-lg text-muted-foreground">
            Tout voir <span aria-hidden>›</span>
          </button>
        </div>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {ANIMATE.map((bg, i) => (
            <button
              key={i}
              className="h-44 w-32 shrink-0 rounded-xl"
              style={{ backgroundImage: bg }}
              aria-label={`Animer la photo ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="px-5 text-2xl font-semibold">Modèles en vedette</h2>
        <div className="mt-4 grid grid-cols-2 gap-1 px-1">
          {TEMPLATES.map((t) => (
            <button key={t.title} className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <img
                src={t.img}
                alt={t.title}
                loading="lazy"
                width={768}
                height={1024}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-lg font-semibold text-foreground">
                {t.title}
              </span>
            </button>
          ))}
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-card" />
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-6 pt-8">
        <div className="mb-2 flex gap-2 px-1">
          <div className="pill flex p-1 text-sm">
            <span className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">
              Vitesse
            </span>
            <span className="px-4 py-1.5 text-muted-foreground">Qualité</span>
          </div>
          <span className="pill px-4 py-2.5 text-sm text-foreground">2:3</span>
        </div>

        <div className="grok-card p-3 shadow-[var(--shadow-float)]">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === "video" ? "Décrivez la vidéo à créer (Généré par l'IA)" : "Que voulez-vous créer ?"}
            className="w-full bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-2">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-surface" aria-label="Ajouter">
              <Plus className="h-5 w-5" />
            </button>
            <div className="pill flex items-center gap-1 p-1">
              <ModeChip active={mode === "image"} onClick={() => setMode("image")} icon={<ImageIcon className="h-5 w-5" />} label="Image" />
              <ModeChip active={mode === "video"} onClick={() => setMode("video")} icon={<Video className="h-5 w-5" />} label="Vidéo" />
              <ModeChip active={mode === "sticker"} onClick={() => setMode("sticker")} icon={<Smile className="h-5 w-5" />} label="Sticker" />
            </div>
            <button
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-foreground"
              aria-label="Envoyer"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <Link to="/support" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Support & aide
          </Link>
        </div>
      </div>
    </main>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "text-foreground"
      }`}
    >
      {icon}
      {active ? label : null}
    </button>
  );
}
