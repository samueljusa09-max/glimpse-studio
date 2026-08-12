import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

export const Route = createFileRoute("/templates/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Modèles Grok — Studio de création" },
      { name: "description", content: "Parcourez tous les modèles Grok : Photo Edit, Reimagine, Anime et plus." },
      { property: "og:title", content: "Modèles Grok" },
      { property: "og:description", content: "Tous les modèles de création Grok en un seul endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesList,
});

function TemplatesList() {
  return (
    <main className="min-h-[100dvh] bg-background pb-12">
      <header className="flex items-center gap-3 px-4 py-4">
        <Link to="/" aria-label="Retour" className="flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold">Modèles</h1>
        <div className="h-10 w-10" />
      </header>
      <div className="grid grid-cols-2 gap-1 px-1">
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
              className="animate-ken-burns h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-lg font-semibold text-white">
              {t.title}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
