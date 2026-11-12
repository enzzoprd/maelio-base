import { queryOptions } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Les tables de l'historique ne figurent pas dans les types générés : client non typé.
const db = supabase as unknown as SupabaseClient;

export type Conversation = { id: string; title: string; source_kind: 'note' | 'memo' | null; source_id: string | null; updated_at: string };
export type StoredMessage = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };

export const conversationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['ai-conversations', userId],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await db
        .from('ai_conversations')
        .select('id, title, source_kind, source_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Conversation[];
    },
  });

export const messagesQuery = (userId: string, conversationId: string | null) =>
  queryOptions({
    queryKey: ['ai-messages', userId, conversationId],
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<StoredMessage[]> => {
      const { data, error } = await db
        .from('ai_messages')
        .select('id, role, content, created_at')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId as string)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as StoredMessage[];
    },
  });

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const { error } = await db.from('ai_conversations').delete().eq('id', conversationId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}
