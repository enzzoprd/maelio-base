import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { formatDate, subjectsQuery } from '@/lib/workspace';
import type { SaveState } from '@/lib/note-autosave';
import { createMemoAutosave, type KeyPoint, type MemoDraft } from '@/lib/memo-autosave';
import { MEMO_COLUMNS, memosQuery, parseKeyPoints, type Memo } from '@/lib/memos';

export const Route = createFileRoute('/_authenticated/memos')({
  head: () => pageHead('Mémos', 'Un mémo par chapitre : ta synthèse et les points à retenir.'),
  component: MemosPage,
  pendingComponent: PageSkeleton,
});

const MAX_POINTS = 50;
const emptyDraft: MemoDraft = { title: '', chapter: '', summary: '', key_points: [], subject_id: null };

function MemosPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: memos = [] } = useQuery(memosQuery(user.id));
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Memo | null>(null);
  const [draft, setDraft] = useState<MemoDraft>(emptyDraft);
  const [deleting, setDeleting] = useState<Memo | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [filter, setFilter] = useState('');
  const autosave = useRef<ReturnType<typeof createMemoAutosave> | null>(null);
  const draftRef = useRef<MemoDraft>(emptyDraft);

  useBlocker({
    shouldBlockFn: async () => {
      try { await autosave.current?.flush(); return false; }
      catch { toast.error('Le mémo n’est pas enregistré. Réessaie avant de quitter la page.'); return true; }
    },
    enableBeforeUnload: saveState !== 'saved',
  });
  useEffect(() => () => { autosave.current?.dispose(); }, []);

  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? null;

  const term = filter.trim().toLowerCase();
  const visible = term
    ? memos.filter(m => `${m.title} ${m.chapter} ${subjectName(m.subject_id) ?? ''}`.toLowerCase().includes(term))
    : memos;

  function openEditor(memo: Memo | null) {
    autosave.current?.dispose();
    setEditing(memo);
    draftRef.current = memo
      ? { title: memo.title, chapter: memo.chapter, summary: memo.summary, key_points: memo.key_points, subject_id: memo.subject_id }
      : emptyDraft;
    setDraft(draftRef.current);
    setSaveState('saved');
    let memoId = memo?.id ?? null;
    autosave.current = createMemoAutosave(draftRef.current, !memo, async payload => {
      const result = memoId
        ? await supabase.from('memos').update(payload).eq('id', memoId).eq('user_id', user.id).select(MEMO_COLUMNS).single()
        : await supabase.from('memos').insert({ ...payload, user_id: user.id }).select(MEMO_COLUMNS).single();
      if (result.error) throw result.error;
      memoId = result.data.id;
      const saved: Memo = { ...result.data, key_points: parseKeyPoints(result.data.key_points) };
      queryClient.setQueryData<Memo[]>(['memos', user.id], old => [saved, ...(old ?? []).filter(m => m.id !== saved.id)]);
    }, setSaveState);
    setDialogOpen(true);
  }

  function changeDraft(patch: Partial<MemoDraft>) {
    draftRef.current = { ...draftRef.current, ...patch };
    setDraft(draftRef.current);
    autosave.current?.update(draftRef.current);
  }

  function updatePoint(index: number, patch: Partial<KeyPoint>) {
    changeDraft({ key_points: draftRef.current.key_points.map((p, i) => (i === index ? { ...p, ...patch } : p)) });
  }
  function removePoint(index: number) {
    changeDraft({ key_points: draftRef.current.key_points.filter((_, i) => i !== index) });
  }
  function addPoint() {
    if (draftRef.current.key_points.length >= MAX_POINTS) return;
    changeDraft({ key_points: [...draftRef.current.key_points, { term: '', definition: '' }] });
  }

  async function closeEditor() {
    if (closing) return;
    setClosing(true);
    try {
      await autosave.current?.flush();
      autosave.current?.dispose();
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['memos', user.id] });
    } catch { toast.error('Impossible d’enregistrer le mémo. Tes modifications restent ouvertes.'); }
    finally { setClosing(false); }
  }

  async function retrySave() {
    try { await autosave.current?.flush(); }
    catch { toast.error('Impossible d’enregistrer le mémo. Vérifie ta connexion et réessaie.'); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('memos').delete().eq('id', deleting.id).eq('user_id', user.id);
    setBusy(false);
    if (error) { toast.error('Impossible de supprimer le mémo. Réessaie.'); return; }
    toast.success('Mémo supprimé.');
    setDeleting(null);
    void queryClient.invalidateQueries({ queryKey: ['memos', user.id] });
  }

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">MON ESPACE MAELIO</div>
          <h1>Mémos</h1>
          <p className="intro-sub">Un mémo par chapitre : ta synthèse et les points à retenir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/notes">Mes notes</Link></Button>
          <Button onClick={() => openEditor(null)}><Plus/>Nouveau mémo</Button>
        </div>
      </div>

      {memos.length === 0 ? (
        <div className="empty-subjects">
          <div>
            <FileText className="text-muted-foreground" size={40} strokeWidth={1.5}/>
            <h2 className="empty-title">Aucun mémo pour l’instant</h2>
            <p className="empty-copy">Résume un chapitre et garde ses points essentiels au même endroit.</p>
            <Button onClick={() => openEditor(null)}><Plus/>Nouveau mémo</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Label htmlFor="memo-filter" className="sr-only">Chercher un mémo</Label>
            <Input id="memo-filter" type="search" placeholder="Chercher un mémo…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-sm"/>
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">Aucun mémo ne correspond à ta recherche.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mes mémos">
              {visible.map(m => (
                <li key={m.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-medium">{m.title || 'Sans titre'}</h2>
                      <p className="text-xs text-muted-foreground">
                        {[subjectName(m.subject_id), m.chapter].filter(Boolean).join(' · ')}
                        {(subjectName(m.subject_id) || m.chapter) ? ' · ' : ''}Modifié le {formatDate(m.updated_at)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditor(m)} aria-label={`Modifier ${m.title || 'le mémo'}`} title="Modifier"><Pencil size={16}/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(m)} aria-label={`Supprimer ${m.title || 'le mémo'}`} title="Supprimer"><Trash2 size={16}/></Button>
                  </div>
                  {m.summary && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{m.summary}</p>}
                  {m.key_points.length > 0 && (
                    <p className="text-xs font-medium text-foreground">{m.key_points.length} point{m.key_points.length > 1 ? 's' : ''} à retenir</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) void closeEditor(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{editing ? 'Modifier le mémo' : 'Nouveau mémo'}</DialogTitle>
          <DialogDescription>Ta synthèse du chapitre, puis les points à retenir.</DialogDescription>
          <form onSubmit={e => { e.preventDefault(); void closeEditor(); }} className="space-y-3">
            <fieldset disabled={closing} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="memo-title">Titre</Label><Input id="memo-title" value={draft.title} onChange={e => changeDraft({ title: e.target.value })} maxLength={120} autoFocus/></div>
              <div className="space-y-1.5"><Label htmlFor="memo-chapter">Chapitre (facultatif)</Label><Input id="memo-chapter" value={draft.chapter} onChange={e => changeDraft({ chapter: e.target.value })} maxLength={120} placeholder="Ex. : Chapitre 3 — Les fonctions"/></div>
              {subjects.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="memo-subject">Matière (facultatif)</Label>
                  <select id="memo-subject" value={draft.subject_id ?? ''} onChange={e => changeDraft({ subject_id: e.target.value || null })} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Aucune matière</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5"><Label htmlFor="memo-summary">Synthèse</Label><Textarea id="memo-summary" value={draft.summary} onChange={e => changeDraft({ summary: e.target.value })} rows={6} placeholder="Résume le chapitre avec tes mots."/></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Points à retenir</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPoint} disabled={draft.key_points.length >= MAX_POINTS}><Plus/>Ajouter un point</Button>
                </div>
                {draft.key_points.length === 0 && <p className="text-sm text-muted-foreground">Ajoute des définitions, des formules ou des dates à retenir.</p>}
                <ul className="space-y-2">
                  {draft.key_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border p-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Input aria-label={`Point ${i + 1} : terme`} placeholder="Terme, formule, date…" value={p.term} maxLength={200} onChange={e => updatePoint(i, { term: e.target.value })}/>
                        <Textarea aria-label={`Point ${i + 1} : définition`} placeholder="Définition ou explication" value={p.definition} maxLength={1000} rows={2} onChange={e => updatePoint(i, { definition: e.target.value })}/>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePoint(i)} aria-label={`Retirer le point ${i + 1}`} title="Retirer"><X size={16}/></Button>
                    </li>
                  ))}
                </ul>
              </div>
            </fieldset>
            <p role="status" aria-live="polite" className={saveState === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {saveState === 'error' ? 'Non enregistré — vérifie ta connexion.' : saveState === 'saving' ? 'Enregistrement…' : saveState === 'pending' ? 'Modifications en attente…' : 'Enregistré'}
            </p>
            {saveState === 'error' && <Button type="button" variant="outline" onClick={() => void retrySave()}>Réessayer</Button>}
            <Button type="submit" disabled={closing} className="w-full">Terminer</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer ce mémo ?</AlertDialogTitle>
          <AlertDialogDescription>« {deleting?.title || 'Sans titre'} » sera supprimé définitivement.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
