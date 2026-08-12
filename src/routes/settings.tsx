import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  X,
  Contrast,
  Vibrate,
  Bell,
  LayoutGrid,
  Globe,
  SlidersHorizontal,
  Blocks,
  Plug,
  Atom,
  Link2,
  Database,
  FolderClosed,
  Star,
  BookOpen,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  ChevronRight,
  ShieldHalf,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GrokMark } from "@/components/grok/GrokLogo";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Paramètres — Grok" },
      { name: "description", content: "Gérez votre profil, votre abonnement et vos préférences Grok." },
      { property: "og:title", content: "Paramètres — Grok" },
      { property: "og:description", content: "Profil, abonnement et préférences Grok." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { session, loading, profile, isStaff, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Utilisateur";

  return (
    <main className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur">
        <Link
          to="/"
          aria-label="Fermer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <X className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold">Paramètres</h1>
        <div className="h-10 w-10" />
      </header>

      <div className="space-y-8 px-4">
        <Link to="/settings/profile" className="grok-card flex items-center gap-4 p-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-2xl">
              {fullName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold">{fullName}</p>
            <p className="truncate text-muted-foreground">@{profile?.username ?? "grok"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <section>
          <SectionTitle>Abonnement</SectionTitle>
          <Link
            to="/subscribe"
            className="supergrok-banner flex items-center gap-3 rounded-full p-3 pl-5"
          >
            <GrokMark className="h-8 w-8 text-brand-foreground" />
            <div className="min-w-0 flex-1 text-brand-foreground">
              <p className="truncate font-semibold">Essayez SuperGrok</p>
              <p className="truncate text-sm opacity-90">Premium Chat, Voix et Images</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-brand-foreground">
              Essayer
            </span>
          </Link>
        </section>

        <section>
          <SectionTitle>Application</SectionTitle>
          <Group>
            <Row icon={<Contrast />} label="Apparence" />
            <Row icon={<Vibrate />} label="Haptique" />
            <Row icon={<Bell />} label="Notifications" />
            <Row icon={<LayoutGrid />} label="Widget" />
            <Row icon={<Globe />} label="Langue de l'application" value="français" />
          </Group>
        </section>

        <section>
          <SectionTitle>Grok</SectionTitle>
          <Group>
            <Row icon={<SlidersHorizontal />} label="Personnaliser Grok" />
            <Row icon={<Blocks />} label="Compétences" />
            <Row icon={<Plug />} label="Connecteurs" />
            <Row icon={<Atom />} label="Avancé" />
          </Group>
        </section>

        <section>
          <SectionTitle>Données et informations</SectionTitle>
          <Group>
            <Row icon={<Link2 />} label="Conversations partagées" />
            <Row icon={<Database />} label="Contrôles de données" />
            <Row icon={<FolderClosed />} label="Stockage" />
          </Group>
        </section>

        <section>
          <SectionTitle>Autres</SectionTitle>
          <Group>
            <Row icon={<Star />} label="Évaluer l'application" />
            <Row icon={<BookOpen />} label="Conditions d'utilisation" />
            <Row icon={<ShieldCheck />} label="Politique de confidentialité" />
          </Group>
        </section>

        <Group>
          <Row icon={<LifeBuoy />} label="Support & Aide" to="/support" />
        </Group>

        {isStaff ? (
          <Group>
            <Row icon={<ShieldHalf />} label="Bureau d'administration" to="/admin" />
          </Group>
        ) : null}

        <button
          onClick={() => {
            void signOut().then(() => navigate({ to: "/auth" }));
          }}
          className="grok-card flex w-full items-center gap-4 p-4 text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-lg">Se déconnecter</span>
        </button>

        <p className="pb-4 text-center text-xs text-muted-foreground">Version 1.4.22 (Version 4426)</p>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="grok-card divide-y divide-border overflow-hidden">{children}</div>;
}

function Row({
  icon,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  to?: "/support" | "/admin";
}) {
  const content = (
    <>
      <span className="text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span className="flex-1 text-lg">{label}</span>
      {value ? <span className="text-muted-foreground">{value}</span> : null}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </>
  );
  if (to) {
    return (
      <Link to={to} className="flex items-center gap-4 px-4 py-4">
        {content}
      </Link>
    );
  }
  return <button className="flex w-full items-center gap-4 px-4 py-4 text-left">{content}</button>;
}
