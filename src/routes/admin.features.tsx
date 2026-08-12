import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/apiConfig";
import { useAuth } from "@/hooks/useAuth";
import type { FeatureFlag } from "@/hooks/useAppSettings";

export const Route = createFileRoute("/admin/features")({
  ssr: false,
  component: AdminFeatures,
});

const CATEGORIES: Record<string, string> = {
  app: "Application",
  grok: "Grok",
  data: "Données et informations",
  studio: "Studio",
};

function AdminFeatures() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canEdit = roles.includes("super_admin") || roles.includes("content_manager");

  const { data: flags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as FeatureFlag[];
    },
  });

  const toggle = async (flag: FeatureFlag) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: !flag.enabled })
      .eq("id", flag.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("feature_flag.toggle", flag.key, { enabled: !flag.enabled });
    await qc.invalidateQueries({ queryKey: ["feature-flags"] });
    toast.success(`${flag.label} ${!flag.enabled ? "activé" : "désactivé"}`);
  };

  const grouped = Object.entries(CATEGORIES).map(([key, label]) => ({
    label,
    items: (flags ?? []).filter((f) => f.category === key),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Fonctionnalités</h1>
        <p className="text-muted-foreground">
          Activez ou désactivez les options visibles par les utilisateurs dans l'application.
        </p>
      </div>

      {grouped.map((g) =>
        g.items.length ? (
          <section key={g.label}>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{g.label}</h2>
            <div className="grok-card divide-y divide-border">
              {g.items.map((f) => (
                <div key={f.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{f.label}</p>
                    {f.description ? (
                      <p className="truncate text-sm text-muted-foreground">{f.description}</p>
                    ) : null}
                  </div>
                  <button
                    role="switch"
                    aria-checked={f.enabled}
                    aria-label={f.label}
                    disabled={!canEdit}
                    onClick={() => void toggle(f)}
                    className={`h-7 w-12 shrink-0 rounded-full p-1 transition disabled:opacity-40 ${
                      f.enabled ? "bg-success" : "bg-surface-2"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                        f.enabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
