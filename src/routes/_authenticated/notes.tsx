import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { formatDate, notesQuery, subjectsQuery, type Note } from '@/lib/workspace';
import { createNoteAutosave, type NoteDraft, type SaveState } from '@/lib/note-autosave';

export const Route = createFileRoute('/_authenticated/notes')({ head: () => pageHead('Notes', 'Vos idées, vos cours, vos mots.'), component: NotesPage, pendingComponent: PageSkeleton });

function NotesPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: notes = [] } = useQuery(notesQuery(user.id));
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const autosave = useRef<ReturnType<typeof createNoteAutosave> | null>(null);
  const draft = useRef<NoteDraft>({ title: '', content: '', subject_id: null });

  useBlocker({
    shouldBlockFn: async () => {
      try { await autosave.current?.flush(); return false; }
      catch { toast.error('La note n’est pas enregistrée. Réessaie avant de quitter la page.'); return true; }
    },
    enableBeforeUnload: saveState !== 'saved',
  });
  useEffect(() => () => { autosave.current?.dispose(); }, []);

  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? null;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['notes', user.id] });
    void queryClient.invalidateQueries({ queryKey: ['search', user.id] });
  }

  function openEditor(note: Note | null) {
    autosave.current?.dispose();
    setEditing(note);
    draft.current = { title: note?.title ?? '', content: note?.content ?? '', subject_id: note?.subject_id ?? null };
    setTitle(draft.current.title); setContent(draft.current.content); setSubjectId(draft.current.subject_id ?? '');
    setSaveState('saved');
    let noteId = note?.id ?? null;
    autosave.current = createNoteAutosave(draft.current, !note, async payload => {
      const result = noteId
        ? await supabase.from('notes').update(payload).eq('id', noteId).eq('user_id', user.id).select('id, title, content, subject_id, updated_at').single()
        : await supabase.from('notes').insert({ ...payload, user_id: user.id }).select('id, title, content, subject_id, updated_at').single();
      if (result.error) throw result.error;
      noteId = result.data.id;
      queryClient.setQueryData<Note[]>(['notes', user.id], old => [result.data, ...(old ?? []).filter(n => n.id !== result.data.id)]);
      refresh();
    }, setSaveState);
    setDialogOpen(true);
  }
  function openCreate() { openEditor(null); }
  function openEdit(note: Note) { openEditor(note); }

  function changeDraft(patch: Partial<NoteDraft>) {
    draft.current = { ...draft.current, ...patch };
    setTitle(draft.current.title); setContent(draft.current.content); setSubjectId(draft.current.subject_id ?? '');
    autosave.current?.update(draft.current);
  }

  async function closeEditor() {
    if (closing) return;
    setClosing(true);
    try {
      await autosave.current?.flush();
      autosave.current?.dispose();
      setDialogOpen(false);
    } catch { toast.error('Impossible d’enregistrer la note. Tes modifications restent ouvertes.'); }
    finally { setClosing(false); }
  }

  async function retrySave() {
    try { await autosave.current?.flush(); }
    catch { toast.error('Impossible d’enregistrer la note. Vérifie ta connexion et réessaie.'); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('notes').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) { toast.error('Impossible de supprimer la note. Réessaie.'); return; }
    toast.success('Note supprimée.');
    setDeleting(null);
    refresh();
  }

  return (
    <div className="page">
      <div className="page-intro">
        <div><div className="eyebrow">MON ESPACE MAELIO</div><h1>Notes</h1><p className="intro-sub">Vos idées, vos cours, vos mots.</p></div>
         <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/memos">Mes mémos</Link></Button><Button onClick={openCreate}><Plus/>Nouvelle note</Button></div>
      </div>

      {notes.length === 0 ? (
        <div className="empty-subjects"><div><NotebookPen className="text-muted-foreground" size={40} strokeWidth={1.5}/><h2 className="empty-title">Aucune note pour l’instant</h2><p className="empty-copy">Une place pour vos idées et vos cours.</p><Button onClick={openCreate}><Plus/>Nouvelle note</Button></div></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mes notes">
          {notes.map(n => (
            <li key={n.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-medium">{n.title || 'Sans titre'}</h2>
                  <p className="text-xs text-muted-foreground">{subjectName(n.subject_id) ? `${subjectName(n.subject_id)} · ` : ''}Modifiée le {formatDate(n.updated_at)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(n)} aria-label={`Modifier ${n.title || 'la note'}`} title="Modifier"><Pencil size={16}/></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(n)} aria-label={`Supprimer ${n.title || 'la note'}`} title="Supprimer"><Trash2 size={16}/></Button>
              </div>
              {n.content && <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) void closeEditor(); }}>
        <DialogContent>
          <DialogTitle>{editing ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle>
          <DialogDescription>{editing ? 'Modifie ta note.' : 'Une idée, un cours, un résumé…'}</DialogDescription>
          <form onSubmit={e => { e.preventDefault(); void closeEditor(); }} className="space-y-3">
            <fieldset disabled={closing} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="note-title">Titre</Label><Input id="note-title" value={title} onChange={e => changeDraft({ title: e.target.value })} maxLength={120} autoFocus/></div>
            {subjects.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="note-subject">Matière (facultatif)</Label>
                <select id="note-subject" value={subjectId} onChange={e => changeDraft({ subject_id: e.target.value || null })} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Aucune matière</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="note-content">Contenu</Label><Textarea id="note-content" value={content} onChange={e => changeDraft({ content: e.target.value })} rows={6}/></div>
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
          <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
          <AlertDialogDescription>« {deleting?.title || 'Sans titre'} » sera supprimée définitivement.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
