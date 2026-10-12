import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
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

  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? null;

  function openCreate() { setEditing(null); setTitle(''); setContent(''); setSubjectId(''); setDialogOpen(true); }
  function openEdit(n: Note) { setEditing(n); setTitle(n.title); setContent(n.content); setSubjectId(n.subject_id ?? ''); setDialogOpen(true); }
  function refresh() { queryClient.invalidateQueries({ queryKey: ['notes', user.id] }); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() && !content.trim()) { toast.error('Écris au moins un titre ou un contenu.'); return; }
    setBusy(true);
    const payload = { title: title.trim(), content, subject_id: subjectId || null };
    const { error } = editing
      ? await supabase.from('notes').update(payload).eq('id', editing.id)
      : await supabase.from('notes').insert({ ...payload, user_id: user.id });
    setBusy(false);
    if (error) { toast.error('Impossible d’enregistrer la note. Réessaie.'); return; }
    toast.success(editing ? 'Note modifiée.' : 'Note ajoutée.');
    setDialogOpen(false);
    refresh();
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
        <Button onClick={openCreate}><Plus/>Nouvelle note</Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editing ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle>
          <DialogDescription>{editing ? 'Modifie ta note.' : 'Une idée, un cours, un résumé…'}</DialogDescription>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="note-title">Titre</Label><Input id="note-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} autoFocus/></div>
            {subjects.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="note-subject">Matière (facultatif)</Label>
                <select id="note-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Aucune matière</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="note-content">Contenu</Label><Textarea id="note-content" value={content} onChange={e => setContent(e.target.value)} rows={6}/></div>
            <Button type="submit" disabled={busy} className="w-full">{editing ? 'Enregistrer' : 'Ajouter'}</Button>
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
