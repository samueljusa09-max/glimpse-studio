import tplPhotoEdit from "@/assets/tpl-photo-edit.jpg";
import tplReimagine from "@/assets/tpl-reimagine.jpg";
import anim1 from "@/assets/anim-1.jpg";
import anim2 from "@/assets/anim-2.jpg";
import anim3 from "@/assets/anim-3.jpg";
import anim4 from "@/assets/anim-4.jpg";

export type Template = {
  slug: string;
  title: string;
  img: string;
  kind: "image" | "video";
  description: string;
  details: string[];
};

export const TEMPLATES: Template[] = [
  {
    slug: "photo-edit",
    title: "Photo Edit",
    img: tplPhotoEdit,
    kind: "image",
    description:
      "Retouchez n'importe quelle photo avec une simple instruction : changez la tenue, l'arrière-plan, la lumière ou le style.",
    details: ["Sortie 2:3 haute définition", "Préserve le visage", "Rendu en quelques secondes"],
  },
  {
    slug: "reimagine",
    title: "Reimagine",
    img: tplReimagine,
    kind: "video",
    description:
      "Transformez votre photo en une courte vidéo animée, avec mouvement de caméra cinématographique.",
    details: ["Vidéo 6s ou 10s", "720p ou 1080p", "Mouvement naturel"],
  },
  {
    slug: "cinematic",
    title: "Cinematic",
    img: anim1,
    kind: "video",
    description: "Un rendu cinéma, lumière dorée et profondeur de champ, à partir d'une seule photo.",
    details: ["Étalonnage cinéma", "Ratio 2:3", "Idéal portraits"],
  },
  {
    slug: "anime",
    title: "Anime",
    img: anim2,
    kind: "image",
    description: "Convertissez votre portrait en illustration anime aux couleurs vives.",
    details: ["Style anime", "Traits fidèles", "Haute résolution"],
  },
  {
    slug: "noir",
    title: "Noir",
    img: anim3,
    kind: "image",
    description: "Un noir et blanc contrasté façon photographie de rue.",
    details: ["Contraste élevé", "Grain argentique", "Ambiance urbaine"],
  },
  {
    slug: "glow",
    title: "Glow",
    img: anim4,
    kind: "video",
    description: "Ajoutez des particules lumineuses animées autour du sujet.",
    details: ["Particules animées", "Fond sombre", "Boucle fluide"],
  },
];

export const ANIMATE_CARDS = TEMPLATES.filter((t) => t.kind === "video" || t.slug !== "photo-edit");

export function getTemplate(slug: string) {
  return TEMPLATES.find((t) => t.slug === slug);
}
