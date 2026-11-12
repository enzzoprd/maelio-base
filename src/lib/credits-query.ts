import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DAILY_FREE_CREDITS, parisToday } from '@/lib/credits';

type UsageClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: { used: number } | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

/** Crédits IA restants aujourd'hui (même clé de cache que le scanner). */
export const creditsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['ai-credits', userId],
    queryFn: async (): Promise<number> => {
      const client = supabase as unknown as UsageClient;
      const { data, error } = await client.from('ai_credit_usage').select('used').eq('user_id', userId).eq('day', parisToday()).maybeSingle();
      if (error) throw new Error(error.message);
      return Math.max(DAILY_FREE_CREDITS - (data?.used ?? 0), 0);
    },
  });
