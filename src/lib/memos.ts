import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { KeyPoint } from '@/lib/memo-autosave';

export type Memo = {
  id: string;
  title: string;
  chapter: string;
  summary: string;
  key_points: KeyPoint[];
  subject_id: string | null;
  updated_at: string;
};

export const MEMO_COLUMNS = 'id, title, chapter, summary, key_points, subject_id, updated_at';

/** key_points est stocké en JSON : on ne garde que des paires texte valides. */
export function parseKeyPoints(value: unknown): KeyPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): KeyPoint[] => {
    if (!item || typeof item !== 'object') return [];
    const { term, definition } = item as Record<string, unknown>;
    return [{ term: typeof term === 'string' ? term : '', definition: typeof definition === 'string' ? definition : '' }];
  });
}

export const memosQuery = (userId: string) =>
  queryOptions({
    queryKey: ['memos', userId],
    queryFn: async (): Promise<Memo[]> => {
      const { data, error } = await supabase
        .from('memos')
        .select(MEMO_COLUMNS)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => ({ ...row, key_points: parseKeyPoints(row.key_points) }));
    },
  });
