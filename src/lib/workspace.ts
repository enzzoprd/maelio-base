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

export type SearchResults = { subjects: Subject[]; notes: Note[] };

/** Recherche dans les matières et les notes de l'utilisateur uniquement. */
export const searchQuery = (userId: string, term: string) =>
  queryOptions({
    queryKey: ['search', userId, term],
    enabled: term.trim().length > 0,
    queryFn: async (): Promise<SearchResults> => {
      const pattern = `%${term.trim().replace(/[%_]/g, '')}%`;
      const [subjects, notes] = await Promise.all([
        supabase.from('subjects').select('id, name, created_at').eq('user_id', userId).ilike('name', pattern).order('name').limit(10),
        supabase.from('notes').select('id, title, content, subject_id, updated_at').eq('user_id', userId).or(`title.ilike.${pattern},content.ilike.${pattern}`).order('updated_at', { ascending: false }).limit(10),
      ]);
      if (subjects.error) throw subjects.error;
      if (notes.error) throw notes.error;
      return { subjects: subjects.data ?? [], notes: notes.data ?? [] };
    },
  });

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export type Homework = { id: string; title: string; details: string; due_date: string; subject_id: string | null; done: boolean };

export const homeworkQuery = (userId: string) =>
  queryOptions({
    queryKey: ['homework', userId],
    queryFn: async (): Promise<Homework[]> => {
      const { data, error } = await supabase
        .from('homework')
        .select('id, title, details, due_date, subject_id, done')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Local YYYY-MM-DD for a date (defaults to today). */
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type SubjectFile = { id: string; subject_id: string; file_name: string; storage_path: string; size_bytes: number; mime_type: string; created_at: string };

export const subjectFilesQuery = (userId: string, subjectId: string) =>
  queryOptions({
    queryKey: ['subject-files', userId, subjectId],
    queryFn: async (): Promise<SubjectFile[]> => {
      const { data, error } = await supabase
        .from('subject_files')
        .select('id, subject_id, file_name, storage_path, size_bytes, mime_type, created_at')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Upcoming = not done and due today or later, soonest first. */
export function upcomingHomework(items: Homework[], today = isoDay()) {
  return items.filter(h => !h.done && h.due_date >= today).sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function dueLabel(due: string, today = isoDay()) {
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  if (days === 0) return 'Pour aujourd’hui';
  if (days === 1) return 'Pour demain';
  if (days < 0) return `En retard · ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(due))}`;
  return `Pour le ${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(due))}`;
}
