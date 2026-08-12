import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/settings/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profil — Grok" },
      { name: "description", content: "Modifiez votre nom, votre pseudo et vos informations de compte." },
      { property: "og:title", content: "Profil — Grok" },
      { property: "og:description", content: "Gérez vos informations de compte Grok." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, loading, profile, user, refresh } = useAuth();
  const navigate = useNavigate();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    setFirst(profile?.first_name ?? "");
    setLast(profile?.last_name ?? "");
    setYear(profile?.birth_year ? String(profile.birth_year) : "");
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: first.trim().slice(0, 60),
        last_name: last.trim().slice(0, 60),
        birth_year: year ? Number(year) : null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Profil enregistré");
  };

  return (
    <main className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur">
        <Link to="/settings" aria-label="Retour" className="flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold">Profil</h1>
        <button onClick={() => void save()} disabled={saving} className="text-lg text-muted-foreground">
          Enregistrer
        </button>
      </header>

      <div className="flex flex-col items-center px-4 pt-6">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-32 w-32 rounded-full object-cover" />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-surface text-4xl">
            {(first || "G").charAt(0)}
          </div>
        )}
        <button className="pill -mt-4 px-5 py-2 font-semibold">Modifier ›</button>
      </div>

      <div className="mt-8 space-y-6 px-4">
        <div className="grok-card divide-y divide-border">
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            maxLength={60}
            placeholder="Prénom"
            className="w-full bg-transparent px-4 py-4 text-lg outline-none"
          />
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            maxLength={60}
            placeholder="Nom"
            className="w-full bg-transparent px-4 py-4 text-lg outline-none"
          />
        </div>

        <div className="grok-card flex items-center justify-between px-4 py-4">
          <span className="text-lg text-muted-foreground">Année de naissance</span>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="2000"
            className="w-24 bg-transparent text-right text-lg outline-none"
          />
        </div>

        <div className="grok-card divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-lg">E-mail</span>
            <span className="truncate pl-4 text-muted-foreground">{profile?.email ?? user?.email}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-lg">Pseudo</span>
            <span className="text-muted-foreground">@{profile?.username ?? "grok"}</span>
          </div>
          <Link to="/subscribe" className="flex items-center justify-between px-4 py-4">
            <span className="text-lg">Gérer le compte</span>
            <span className="text-muted-foreground">›</span>
          </Link>
        </div>

        <p className="px-2 text-sm text-muted-foreground">
          Crédits disponibles : {profile?.credits ?? 0}
        </p>
      </div>
    </main>
  );
}
