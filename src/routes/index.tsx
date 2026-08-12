import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SlidersHorizontal, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GrokWordmark } from "@/components/grok/GrokLogo";
import { Composer, type ComposerMode } from "@/components/grok/Composer";
import { TEMPLATES } from "@/lib/templates";
import { useFeatureFlags } from "@/hooks/useAppSettings";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ComposerMode>("image");
  const { isOn, loaded } = useFeatureFlags();
  const templatesOn = !loaded || isOn("templates");

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const animate = TEMPLATES.filter((t) => t.kind === "video" || t.slug === "anime");

  return (
    <main className="min-h-[100dvh] bg-background pb-52">
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
          <h1 className="text-2xl font-semibold">Animez vos photos</h1>
          <Link to="/templates" className="flex items-center gap-1 text-lg text-muted-foreground">
            Tout voir <span aria-hidden>›</span>
          </Link>
        </div>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {animate.map((t) => (
            <Link
              key={t.slug}
              to="/templates/$slug"
              params={{ slug: t.slug }}
              className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl bg-card"
              aria-label={`Ouvrir le modèle ${t.title}`}
            >
              <img
                src={t.img}
                alt={t.title}
                loading="lazy"
                width={512}
                height={768}
                className="animate-ken-burns h-full w-full object-cover"
              />
              <span className="animate-sheen pointer-events-none absolute inset-0" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-sm font-medium text-white">
                {t.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {templatesOn ? (
        <section className="mt-8">
          <h2 className="px-5 text-2xl font-semibold">Modèles en vedette</h2>
          <div className="mt-4 grid grid-cols-2 gap-1 px-1">
            {TEMPLATES.map((t) => (
              <Link
                key={t.slug}
                to="/templates/$slug"
                params={{ slug: t.slug }}
                className="relative aspect-[3/4] overflow-hidden rounded-lg bg-card"
              >
                <img
                  src={t.img}
                  alt={t.title}
                  loading="lazy"
                  width={512}
                  height={768}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-lg font-semibold text-white">
                  {t.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Composer mode={mode} onModeChange={setMode} />

      <div className="fixed inset-x-0 bottom-1 z-30 flex justify-center">
        <Link to="/support" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Support & aide
        </Link>
      </div>
    </main>
  );
}
