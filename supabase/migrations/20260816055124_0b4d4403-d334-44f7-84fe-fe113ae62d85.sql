-- =========================
-- Pays de paiement
-- =========================
CREATE TABLE public.payment_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  dial_code text NOT NULL DEFAULT '',
  currency text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_countries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_countries TO authenticated;
GRANT ALL ON public.payment_countries TO service_role;
ALTER TABLE public.payment_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries public read" ON public.payment_countries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "countries manage" ON public.payment_countries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'));
CREATE TRIGGER trg_pay_countries_updated BEFORE UPDATE ON public.payment_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Moyens de paiement
-- =========================
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.payment_countries(code) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'mobile_money',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, code)
);
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "methods public read" ON public.payment_methods FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "methods manage" ON public.payment_methods FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'));
CREATE TRIGGER trg_pay_methods_updated BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Taux de change (cache serveur)
-- =========================
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'USD',
  currency text NOT NULL,
  rate numeric NOT NULL,
  source text NOT NULL DEFAULT 'open.er-api.com',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base, currency)
);
GRANT SELECT ON public.exchange_rates TO authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates read" ON public.exchange_rates FOR SELECT TO authenticated USING (true);

-- =========================
-- Réglages paiement (frais, virement bancaire)
-- =========================
CREATE TABLE public.payment_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings manage" ON public.payment_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'accountant'));
CREATE TRIGGER trg_pay_settings_updated BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Historique des transactions enrichi
-- =========================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS original_amount_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS converted_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_channel text NOT NULL DEFAULT 'mobile_money',
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS cycle text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_key ON public.payments (reference);

-- =========================
-- Données de configuration par défaut
-- =========================
INSERT INTO public.payment_countries (code, name, flag, dial_code, currency, sort_order) VALUES
  ('CD', 'République démocratique du Congo', '🇨🇩', '+243', 'CDF', 1),
  ('CG', 'Congo-Brazzaville', '🇨🇬', '+242', 'XAF', 2),
  ('CM', 'Cameroun', '🇨🇲', '+237', 'XAF', 3),
  ('CI', 'Côte d''Ivoire', '🇨🇮', '+225', 'XOF', 4),
  ('SN', 'Sénégal', '🇸🇳', '+221', 'XOF', 5),
  ('BF', 'Burkina Faso', '🇧🇫', '+226', 'XOF', 6),
  ('GA', 'Gabon', '🇬🇦', '+241', 'XAF', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.payment_methods (country_code, code, label, sort_order) VALUES
  ('CD', 'airtel_money', 'Airtel Money', 1),
  ('CD', 'orange_money', 'Orange Money', 2),
  ('CD', 'mpesa', 'Vodacom M-Pesa', 3),
  ('CG', 'airtel_money', 'Airtel Money', 1),
  ('CG', 'mtn_momo', 'MTN Mobile Money', 2),
  ('CM', 'orange_money', 'Orange Money', 1),
  ('CM', 'mtn_momo', 'MTN Mobile Money', 2),
  ('CI', 'orange_money', 'Orange Money', 1),
  ('CI', 'mtn_momo', 'MTN Mobile Money', 2),
  ('CI', 'moov_money', 'Moov Money', 3),
  ('CI', 'wave', 'Wave', 4),
  ('SN', 'orange_money', 'Orange Money', 1),
  ('SN', 'wave', 'Wave', 2),
  ('SN', 'free_money', 'Free Money', 3),
  ('BF', 'orange_money', 'Orange Money', 1),
  ('BF', 'moov_money', 'Moov Money', 2),
  ('GA', 'airtel_money', 'Airtel Money', 1),
  ('GA', 'moov_money', 'Moov Money', 2)
ON CONFLICT (country_code, code) DO NOTHING;

INSERT INTO public.payment_settings (key, value) VALUES
  ('fees', '{"percent": 0, "fixed_usd": 0, "enabled": false}'::jsonb),
  ('bank_transfer', '{"enabled": true, "bank_name": "", "account_name": "", "account_number": "", "iban": "", "swift": "", "instructions": "Effectuez le virement puis envoyez la preuve depuis Support & Aide. Votre abonnement sera activé après vérification."}'::jsonb)
ON CONFLICT (key) DO NOTHING;