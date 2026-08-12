ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'supergrok',
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'S''abonner',
  ADD COLUMN IF NOT EXISTS annual_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge text;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'app',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags public read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags manage" ON public.feature_flags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'content_manager'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'content_manager'));
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY,
  appearance text NOT NULL DEFAULT 'dark',
  haptics boolean NOT NULL DEFAULT true,
  notifications boolean NOT NULL DEFAULT true,
  widget boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'fr',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own read" ON public.user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY "prefs own insert" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "prefs own update" ON public.user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (key, label, description, category, sort_order, enabled) VALUES
  ('appearance','Apparence','Choix du thème clair/sombre','app',1,true),
  ('haptics','Haptique','Retour haptique sur mobile','app',2,true),
  ('notifications','Notifications','Alertes de l''application','app',3,true),
  ('widget','Widget','Widget écran d''accueil','app',4,true),
  ('language','Langue de l''application','Sélection de la langue','app',5,true),
  ('customize_grok','Personnaliser Grok','Instructions personnalisées','grok',6,true),
  ('skills','Compétences','Compétences activables','grok',7,true),
  ('connectors','Connecteurs','Connexion de services tiers','grok',8,false),
  ('advanced','Avancé','Options avancées','grok',9,false),
  ('shared_chats','Conversations partagées','Historique des partages','data',10,true),
  ('data_controls','Contrôles de données','Gestion et suppression des données','data',11,true),
  ('storage','Stockage','Espace utilisé','data',12,true),
  ('video_mode','Mode Vidéo','Génération vidéo dans le composer','studio',13,true),
  ('templates','Modèles en vedette','Pages de modèles cliquables','studio',14,true)
ON CONFLICT (key) DO NOTHING;

UPDATE public.plans SET is_active = false;

INSERT INTO public.plans (name, slug, tier, tagline, description, price, annual_price, currency, interval, trial_days, cta_label, badge, msg_quota, image_quota, video_quota, features, is_active, sort_order) VALUES
 ('SuperGrok','supergrok','supergrok','Essayez 0,00 € pour 7 jours','Créez des images et des vidéos IA époustouflantes',35,349,'EUR','month',7,'Commencer l''essai gratuit de 7 jours',NULL,1000,300,50,
  '["Créez des images et des vidéos IA époustouflantes","Importez plus de fichiers pour des réponses encore plus pertinentes","Des réponses fulgurantes"]'::jsonb,true,1),
 ('SuperGrok Plus','supergrok-plus','plus','Plus de puissance au quotidien','Tout dans SuperGrok, avec des limites élargies',60,599,'EUR','month',0,'Passer à SuperGrok Plus','Plus',3000,900,150,
  '["Tout dans SuperGrok","Limites d''utilisation élargies","Accès anticipé aux nouveautés"]'::jsonb,true,2),
 ('SuperGrok Heavy','supergrok-heavy','heavy','La version la plus puissante de Grok','Pour les usages les plus intensifs',349,3490,'EUR','month',0,'Passer à SuperGrok Heavy','Heavy',100000,10000,2000,
  '["Tout dans SuperGrok Plus","Vidéo native 1080p en Imagine","Utilisation la plus élevée à la vitesse la plus rapide","Résolution des problèmes les plus complexes","X Premium+ sans frais supplémentaires"]'::jsonb,true,3)
ON CONFLICT DO NOTHING;