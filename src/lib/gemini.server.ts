// Outils côté serveur uniquement (le suffixe .server.ts empêche l'envoi au navigateur).
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { DAILY_FREE_CREDITS } from '@/lib/credits';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

type RpcClient = {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
};
const admin = supabaseAdmin as unknown as RpcClient;

/** Réserve 1 crédit pour la journée. Retourne les crédits restants, ou lève une erreur lisible. */
export async function reserveCredit(userId: string): Promise<number> {
  const { data, error } = await admin.rpc('consume_ai_credit', { p_user_id: userId, p_limit: DAILY_FREE_CREDITS });
  if (error || typeof data !== 'number') {
    console.error('[gemini] crédits indisponibles', error?.message ?? 'réponse inattendue');
    throw new Error('L’assistant est indisponible pour le moment. Réessaie plus tard.');
  }
  if (data < 0) throw new Error(`Tu as utilisé tes ${DAILY_FREE_CREDITS} crédits du jour. Ils reviennent demain.`);
  return data;
}

export async function refundCredit(userId: string): Promise<void> {
  const { error } = await admin.rpc('refund_ai_credit', { p_user_id: userId });
  if (error) console.error('[gemini] remboursement du crédit impossible', error.message);
}

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
export type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

export async function generateText(options: { system: string; contents: GeminiContent[]; maxOutputTokens?: number }): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante');
  const model = process.env['GEMINI_MODEL'] || DEFAULT_MODEL;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: options.system }] },
      contents: options.contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: options.maxOutputTokens ?? 1500 },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Gemini a répondu ${response.status}`);
  const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (json.candidates?.[0]?.content?.parts ?? []).map(part => part.text ?? '').join('').trim();
}
