CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  details text NOT NULL DEFAULT '',
  due_date date NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own homework select" ON public.homework FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own homework insert" ON public.homework FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own homework update" ON public.homework FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own homework delete" ON public.homework FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX homework_user_due_idx ON public.homework (user_id, due_date);
CREATE TRIGGER homework_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();