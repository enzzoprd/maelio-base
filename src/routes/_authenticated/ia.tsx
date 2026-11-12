import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { notesQuery } from '@/lib/workspace';
import { memosQuery } from '@/lib/memos';
import { DAILY_FREE_CREDITS } from '@/lib/credits';
import { creditsQuery } from '@/lib/credits-query';
import { askAssistant } from '@/lib/ia.functions';

export const Route = createFileRoute('/_authenticated/ia')({
  head: () => pageHead('IA', 'Pose tes questions de cours à l’assistant de révision.'),
  component: IaPage,
  pendingComponent: PageSkeleton,
});

type Message = { role: 'user' | 'assistant'; content: string };

function IaPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: credits } = useQuery(creditsQuery(user.id));
  const { data: notes = [] } = useQuery(notesQuery(user.id));
  const { data: memos = [] } = useQuery(memosQuery(user.id));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);

  const noCredits = credits !== undefined && credits <= 0;

  async function send() {
    const question = input.trim();
    if (!question || busy || noCredits) return;
    const next: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setError(null);
    setBusy(true);
    try {
      const [kind, id] = source.split(':');
      const result = await askAssistant({
        data: {
          messages: next.slice(-11),
          source: kind && id && (kind === 'note' || kind === 'memo') ? { kind, id } : null,
        },
      });
      setMessages([...next, { role: 'assistant', content: result.reply }]);
      queryClient.setQueryData(['ai-credits', user.id], result.remaining);
    } catch (e) {
      // On retire la question pour garder une conversation cohérente, et on la remet dans le champ.
      setMessages(messages);
      setInput(question);
      setError(e instanceof Error && e.message ? e.message : 'L’assistant n’a pas pu répondre. Réessaie.');
      void queryClient.invalidateQueries({ queryKey: ['ai-credits', user.id] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">MON ESPACE MAELIO</div>
          <h1>IA</h1>
          <p className="intro-sub">Pose tes questions de cours à l’assistant de révision.</p>
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          {credits === undefined ? 'Crédits du jour…' : `Crédits du jour : ${credits} / ${DAILY_FREE_CREDITS}`}
        </p>
      </div>

      <div className="space-y-4">
        {(notes.length > 0 || memos.length > 0) && (
          <div className="space-y-1.5">
            <Label htmlFor="ia-source">Cours lié (facultatif)</Label>
            <select id="ia-source" value={source} onChange={e => setSource(e.target.value)} className="h-11 w-full max-w-md rounded-md border bg-background px-3 text-sm">
              <option value="">Aucun : question libre</option>
              {notes.length > 0 && (
                <optgroup label="Mes notes">
                  {notes.map(n => <option key={n.id} value={`note:${n.id}`}>{n.title || 'Sans titre'}</option>)}
                </optgroup>
              )}
              {memos.length > 0 && (
                <optgroup label="Mes mémos">
                  {memos.map(m => <option key={m.id} value={`memo:${m.id}`}>{m.title || 'Sans titre'}</option>)}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-muted-foreground">L’assistant s’appuiera sur ce document pour répondre.</p>
          </div>
        )}

        <div className="min-h-48 space-y-3 rounded-lg border bg-card p-4" role="log" aria-live="polite" aria-label="Conversation avec l’assistant">
          {messages.length === 0 && !busy && (
            <p className="text-sm text-muted-foreground">Pose ta première question, par exemple : « Explique-moi la photosynthèse simplement » ou « Fais-moi réviser ce chapitre ».</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground' : 'mr-auto max-w-[85%] whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm'}>
              <span className="sr-only">{m.role === 'user' ? 'Toi : ' : 'Assistant : '}</span>{m.content}
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground" role="status">L’assistant réfléchit…</p>}
          <div ref={bottom}/>
        </div>

        {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {noCredits && <p className="text-sm text-muted-foreground" role="status">Tu as utilisé tous tes crédits du jour. Ils reviennent demain.</p>}

        <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); void send(); }}>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ia-input" className="sr-only">Ta question</Label>
            <Textarea
              id="ia-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={2}
              maxLength={4000}
              placeholder="Ta question… (Entrée pour envoyer, Maj+Entrée pour un retour à la ligne)"
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || noCredits || !input.trim()} aria-label="Envoyer (1 crédit)"><Send/>Envoyer</Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Chaque réponse coûte 1 crédit. L’assistant peut se tromper : vérifie avec ton cours. La conversation n’est pas enregistrée.</p>
          {messages.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => { setMessages([]); setError(null); }} disabled={busy}>Nouvelle conversation</Button>}
        </div>
      </div>
    </div>
  );
}
