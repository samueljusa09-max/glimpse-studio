import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  enabled: boolean;
  sort_order: number;
};

export type Preferences = {
  appearance: string;
  haptics: boolean;
  notifications: boolean;
  widget: boolean;
  language: string;
};

const DEFAULT_PREFS: Preferences = {
  appearance: "dark",
  haptics: true,
  notifications: true,
  widget: false,
  language: "fr",
};

export function useFeatureFlags() {
  const { data } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as FeatureFlag[];
    },
    staleTime: 60_000,
  });
  const flags = data ?? [];
  return {
    flags,
    isOn: (key: string) => flags.find((f) => f.key === key)?.enabled ?? false,
    loaded: !!data,
  };
}

export function usePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Preferences) ?? DEFAULT_PREFS;
    },
  });

  const prefs = data ?? DEFAULT_PREFS;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", prefs.appearance === "light");
  }, [prefs.appearance]);

  const update = async (patch: Partial<Preferences>) => {
    if (!user) return;
    qc.setQueryData(["preferences", user.id], { ...prefs, ...patch });
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...prefs, ...patch }, { onConflict: "user_id" });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["preferences", user.id] });
  };

  return { prefs, update };
}

export function haptic(enabled: boolean, pattern: number | number[] = 8) {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
