import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, CreditCard, Headphones, Users, ShieldHalf, ScrollText, ArrowLeft, ToggleRight } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

export const NAV: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: AppRole[] }[] = [
  { to: "/admin", label: "Vue d'ensemble", icon: BarChart3, roles: ["super_admin", "accountant", "content_manager", "support_operator"] },
  { to: "/admin/finances", label: "Finances & Tarifs", icon: CreditCard, roles: ["super_admin", "accountant"] },
  { to: "/admin/support", label: "Support & Messagerie", icon: Headphones, roles: ["super_admin", "support_operator"] },
  { to: "/admin/users", label: "Utilisateurs & Quotas", icon: Users, roles: ["super_admin", "content_manager"] },
  { to: "/admin/features", label: "Fonctionnalités", icon: ToggleRight, roles: ["super_admin", "content_manager"] },

  { to: "/admin/team", label: "Équipe & Rôles", icon: ShieldHalf, roles: ["super_admin"] },
  { to: "/admin/logs", label: "Journal d'audit", icon: ScrollText, roles: ["super_admin"] },
];

function AdminLayout() {
  const { loading, session, isStaff, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) void navigate({ to: "/auth" });
    else if (!isStaff) void navigate({ to: "/" });
  }, [loading, session, isStaff, navigate]);

  if (loading || !isStaff) {
    return <div className="grid min-h-[100dvh] place-items-center text-muted-foreground">Chargement…</div>;
  }

  const allowed = NAV.filter((n) => n.roles.some((r) => roles.includes(r)));

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <aside className="border-b border-border bg-sidebar p-4 lg:min-h-[100dvh] lg:w-72 lg:border-b-0 lg:border-r">
        <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à l'application
        </Link>
        <p className="mb-4 text-lg font-semibold">Bureau d'administration</p>
        <nav className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
          {allowed.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
