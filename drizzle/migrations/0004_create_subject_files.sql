CREATE TABLE public.subject_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subject_files_user_idx ON public.subject_files(user_id, subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_files TO authenticated;
GRANT ALL ON public.subject_files TO service_role;
ALTER TABLE public.subject_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subject files" ON public.subject_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subject files" ON public.subject_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subject files" ON public.subject_files FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own documents objects" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own documents objects" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own documents objects" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);