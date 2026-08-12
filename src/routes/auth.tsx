import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { GrokMark } from "@/components/grok/GrokLogo";
import spaceBg from "@/assets/space-bg.jpg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — Grok" },
      { name: "description", content: "Connectez-vous à Grok avec Google, Apple ou votre e-mail." },
      { property: "og:title", content: "Connexion — Grok" },
      { property: "og:description", content: "Connectez-vous à Grok en quelques secondes." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.24 1.4-1.7 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.7 0 2.85.72 3.5 1.34l2.4-2.31C16.4 3.9 14.4 3 12 3a9 9 0 1 0 0 18c5.2 0 8.63-3.65 8.63-8.8 0-.6-.06-1.05-.28-1.1Z"
      />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.24 2H21l-6.55 7.49L22.5 22h-6.3l-4.93-6.44L5.6 22H2.83l7.02-8.02L1.5 2h6.46l4.46 5.9L18.24 2Zm-1.1 18.3h1.53L7.02 3.6H5.38l11.76 16.7Z"
      />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.36 12.78c.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.86-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.54ZM14.2 5.62c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.7-.92 2.7.97.08 1.97-.49 2.58-1.23Z"
      />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"providers" | "email">("providers");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/" });
  }, [session, navigate]);

  const oauth = async (provider: "google" | "apple") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Connexion impossible pour le moment.");
      return;
    }
    if (!result.redirected) void navigate({ to: "/" });
  };

  const emailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else toast.success("Vérifiez votre boîte mail pour confirmer votre compte.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else void navigate({ to: "/" });
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      <img
        src={spaceBg}
        alt=""
        width={896}
        height={1600}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />

      <div className="relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-24">
        <div className="flex flex-1 flex-col items-center">
          <h1 className="text-6xl font-semibold tracking-tight text-foreground">Grok</h1>
          <p className="mt-3 font-mono text-sm tracking-widest text-muted-foreground">
            Understand the Universe_
          </p>
        </div>

        {mode === "providers" ? (
          <div className="space-y-3">
            <ProviderButton onClick={() => void oauth("google")} disabled={busy} icon={<GoogleIcon />}>
              Continuer avec Google
            </ProviderButton>
            <ProviderButton
              onClick={() => toast("Connexion X bientôt disponible.")}
              disabled={busy}
              icon={<XIcon />}
            >
              Continuer avec X
            </ProviderButton>
            <ProviderButton onClick={() => void oauth("apple")} disabled={busy} icon={<AppleIcon />}>
              Se connecter avec Apple
            </ProviderButton>
            <ProviderButton
              onClick={() => setMode("email")}
              highlighted
              icon={<MailIcon />}
            >
              Continuer avec l'e-mail
            </ProviderButton>
          </div>
        ) : (
          <form onSubmit={emailAuth} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse e-mail"
              className="w-full rounded-full bg-surface/80 px-6 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full rounded-full bg-surface/80 px-6 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSignup ? "Créer mon compte" : "Se connecter"}
            </button>
            <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
              <button type="button" onClick={() => setIsSignup((v) => !v)}>
                {isSignup ? "J'ai déjà un compte" : "Créer un compte"}
              </button>
              <button type="button" onClick={() => setMode("providers")}>
                Retour
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          En continuant, vous acceptez les <Link to="/" className="text-foreground">Conditions d'utilisation</Link>{" "}
          et la <Link to="/" className="text-foreground">Politique de confidentialité</Link>
        </p>
      </div>
    </main>
  );
}

function ProviderButton({
  children,
  icon,
  onClick,
  disabled,
  highlighted,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-3 rounded-full bg-surface/70 px-6 py-4 text-lg font-medium text-foreground backdrop-blur transition active:scale-[0.99] disabled:opacity-60 ${
        highlighted ? "ring-1 ring-warning/60" : ""
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
