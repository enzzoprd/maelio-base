import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { notesQuery } from '@/lib/workspace';
import { memosQuery } from '@/lib/memos';
import { DAILY_FREE_CREDITS } from '@/lib/credits';
import { creditsQuery } from '@/lib/credits-query';
import { askAssistant } from '@/lib/ia.functions';
import { conversationsQuery, deleteConversation, messagesQuery, type Conversation, type StoredMessage } from '@/lib/ia-history';

export const Route = createFileRoute('/_authenticated/ia')({
  head: () => pageHead('IA', 'Pose tes questions de cours à l’assistant de révision.'),
  component: IaPage,
  pendingComponent: PageSkeleton,
});

type Message = { role: 'user' | 'assistant'; content: string };

function parseSource(value: string): { kind: 'note' | 'memo'; id: string } | null {
  const [kind, id] = value.split(':');
  return id && (kind === 'note' || kind === 'memo') ? { kind, id } : null;
}

function IaPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: credits } = useQuery(creditsQuery(user.id));
  const { data: notes = [] } = useQuery(notesQuery(user.id));
  const { data: memos = [] } = useQuery(memosQuery(user.id));
  const { data: conversations = [] } = useQuery(conversationsQuery(user.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: stored = [], isLoading: loadingMessages } = useQuery(messagesQuery(user.id, activeId));
  const [local, setLocal] = useState<Message[]>([]); // échanges non enregistrés (échec de sauvegarde)
  const [pending, setPending] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [removing, setRemoving] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const shown: Message[] = [
    ...(activeId ? stored.map(m => ({ role: m.role, content: m.content })) : []),
    ...local,
    ...(pending ? [{ role: 'user' as const, content: pending }] : []),
  ];

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [shown.length, busy]);

  const noCredits = credits !== undefined && credits <= 0;

  function newConversation() {
    if (busy) return;
    setActiveId(null);
    setLocal([]);
    setSource('');
    setError(null);
  }

  function selectConversation(c: Conversation) {
    if (busy) return;
    setActiveId(c.id);
    setLocal([]);
    setError(null);
    setSource(c.source_kind && c.source_id ? `${c.source_kind}:${c.source_id}` : '');
  }

  async function send() {
    const question = input.trim();
    if (!question || busy || noCredits) return;
    setPending(question);
    setInput('');
    setError(null);
    setBusy(true);
    try {
      const result = await askAssistant({ data: { conversationId: activeId, message: question, source: parseSource(source) } });
      queryClient.setQueryData(['ai-credits', user.id], result.remaining);
      if (result.saved && result.conversationId) {
        const id = result.conversationId;
        const now = new Date().toISOString();
        queryClient.setQueryData<StoredMessage[]>(['ai-messages', user.id, id], old => [
          ...(old ?? []),
          { id: `tmp-user-${now}`, role: 'user', content: question, created_at: now },
          { id: `tmp-assistant-${now}`, role: 'assistant', content: result.reply, created_at: now },
        ]);
        setActiveId(id);
        void queryClient.invalidateQueries({ queryKey: ['ai-messages', user.id, id] });
        void queryClient.invalidateQueries({ queryKey: ['ai-conversations', user.id] });
      } else {
        setLocal(l => [...l, { role: 'user', content: question }, { role: 'assistant', content: result.reply }]);
        toast.error('Cette réponse n’a pas pu être enregistrée dans l’historique.');
      }
    } catch (e) {
      setInput(question);
      setError(e instanceof Error && e.message ? e.message : 'L’assistant n’a pas pu répondre. Réessaie.');
      void queryClient.invalidateQueries({ queryKey: ['ai-credits', user.id] });
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  async function removeConversation() {
    const target = deleting;
    if (!target) return;
    setRemoving(true);
    try {
      await deleteConversation(user.id, target.id);
      toast.success('Conversation supprimée.');
      if (activeId === target.id) { setActiveId(null); setLocal([]); setSource(''); }
      queryClient.removeQueries({ queryKey: ['ai-messages', user.id, target.id] });
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations', user.id] });
      setDeleting(null);
    } catch {
      toast.error('Impossible de supprimer la conversation. Réessaie.');
    } finally {
      setRemoving(false);
    }
  }

  const activeTitle = conversations.find(c => c.id === activeId)?.title;

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

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Mes conversations" className="space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={newConversation} disabled={busy}><Plus/>Nouvelle conversation</Button>
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tes conversations apparaîtront ici.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto lg:max-h-[32rem]">
              {conversations.map(c => (
                <li key={c.id} className="flex items-center gap-1">
                  <Button type="button" variant={c.id === activeId ? 'secondary' : 'ghost'} className="h-auto min-w-0 flex-1 justify-start overflow-hidden px-2 py-2 text-left" aria-current={c.id === activeId ? 'true' : undefined} onClick={() => selectConversation(c)}>
                    <span className="truncate">{c.title || 'Sans titre'}</span>
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer la conversation « ${c.title || 'Sans titre'} »`} title="Supprimer" onClick={() => setDeleting(c)}><Trash2 size={16}/></Button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="min-w-0 space-y-4">
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

          {activeTitle && <h2 className="truncate text-sm font-medium text-muted-foreground">{activeTitle}</h2>}
          <div className="min-h-48 space-y-3 rounded-lg border bg-card p-4" role="log" aria-live="polite" aria-label="Conversation avec l’assistant">
            {shown.length === 0 && !busy && !(activeId && loadingMessages) && (
              <p className="text-sm text-muted-foreground">Pose ta première question, par exemple : « Explique-moi la photosynthèse simplement » ou « Fais-moi réviser ce chapitre ».</p>
            )}
            {activeId && loadingMessages && <p className="text-sm text-muted-foreground" role="status">Chargement de la conversation…</p>}
            {shown.map((m, i) => (
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
          <p className="text-xs text-muted-foreground">Chaque réponse coûte 1 crédit. L’assistant peut se tromper : vérifie avec ton cours. Tes conversations sont enregistrées dans ton compte et supprimées avec lui.</p>
        </div>
      </div>

      <AlertDialog open={Boolean(deleting)} onOpenChange={o => { if (!o && !removing) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
          <AlertDialogDescription>« {deleting?.title || 'Sans titre'} » et tous ses messages seront supprimés définitivement.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={removing} onClick={e => { e.preventDefault(); void removeConversation(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
