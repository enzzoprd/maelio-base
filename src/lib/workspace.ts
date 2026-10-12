import { queryOptions, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Subject = { id: string; name: string; created_at: string };
export type Note = { id: string; title: string; content: string; subject_id: string | null; updated_at: string };

export const subjectsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['subjects', userId],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const notesQuery = (userId: string) =>
  queryOptions({
    queryKey: ['notes', userId],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, subject_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Signed URL for a private avatar object, refreshed hourly. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    enabled: Boolean(path),
    staleTime: 55 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  }).data ?? null;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}
