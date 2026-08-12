import { useState } from "react";
import { Plus, Image as ImageIcon, Video, Smile, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { haptic, usePreferences, useFeatureFlags } from "@/hooks/useAppSettings";

export type ComposerMode = "image" | "video" | "sticker";

const RATIOS = ["2:3", "1:1", "3:2", "9:16"] as const;

export function Composer({
  mode,
  onModeChange,
}: {
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
}) {
  const { prefs } = usePreferences();
  const { isOn, loaded } = useFeatureFlags();
  const videoEnabled = !loaded || isOn("video_mode");

  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"speed" | "quality">("speed");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("2:3");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [duration, setDuration] = useState<6 | 10>(6);

  const tap = () => haptic(prefs.haptics);

  const submit = () => {
    tap();
    if (!prompt.trim()) {
      toast.error("Décrivez d'abord ce que vous voulez créer.");
      return;
    }
    toast.success(
      mode === "video"
        ? `Vidéo ${resolution} · ${duration}s · ${ratio} en file d'attente`
        : `${mode === "image" ? "Image" : "Sticker"} ${ratio} en file d'attente`,
    );
    setPrompt("");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-6 pt-8">
      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-1">
        <div className="pill flex shrink-0 p-1 text-sm">
          {(["speed", "quality"] as const).map((q) => (
            <button
              key={q}
              onClick={() => {
                tap();
                setQuality(q);
              }}
              className={`rounded-full px-4 py-1.5 transition ${
                quality === q ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {q === "speed" ? "Vitesse" : "Qualité"}
            </button>
          ))}
        </div>

        {mode === "video" ? (
          <>
            <div className="pill flex shrink-0 p-1 text-sm">
              {(["720p", "1080p"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    tap();
                    setResolution(r);
                  }}
                  className={`rounded-full px-4 py-1.5 transition ${
                    resolution === r ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="pill flex shrink-0 p-1 text-sm">
              {([6, 10] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    tap();
                    setDuration(d);
                  }}
                  className={`rounded-full px-4 py-1.5 transition ${
                    duration === d ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="pill flex shrink-0 p-1 text-sm">
          {RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => {
                tap();
                setRatio(r);
              }}
              className={`rounded-full px-3 py-1.5 transition ${
                ratio === r ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grok-card p-3 shadow-[var(--shadow-float)]">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={
            mode === "video" ? "Décrivez la vidéo à créer (Généré par l'IA)" : "Que voulez-vous créer ?"
          }
          className="w-full bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => {
              tap();
              toast("Import de fichier bientôt disponible");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface"
            aria-label="Ajouter"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="pill flex items-center gap-1 p-1">
            <ModeChip
              active={mode === "image"}
              onClick={() => {
                tap();
                onModeChange("image");
              }}
              icon={<ImageIcon className="h-5 w-5" />}
              label="Image"
            />
            <ModeChip
              active={mode === "video"}
              onClick={() => {
                tap();
                if (!videoEnabled) {
                  toast.error("Le mode Vidéo est désactivé par l'administrateur.");
                  return;
                }
                onModeChange("video");
              }}
              icon={<Video className="h-5 w-5" />}
              label="Vidéo"
              disabled={!videoEnabled}
            />
            <ModeChip
              active={mode === "sticker"}
              onClick={() => {
                tap();
                onModeChange("sticker");
              }}
              icon={<Smile className="h-5 w-5" />}
              label="Sticker"
            />
          </div>
          <button
            onClick={submit}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-foreground"
            aria-label="Envoyer"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "text-foreground"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {icon}
      {active ? label : null}
    </button>
  );
}
