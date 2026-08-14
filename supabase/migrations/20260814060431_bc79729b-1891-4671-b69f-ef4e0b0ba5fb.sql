-- Générations IA
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video','sticker')),
  prompt text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generations own read" ON public.generations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "generations own insert" ON public.generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "generations own update" ON public.generations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "generations own delete" ON public.generations FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_generations_updated BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_generations_user ON public.generations (user_id, created_at DESC);

-- Support : catégorie de ticket
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Profils : anti-doublon e-mail de bienvenue
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;