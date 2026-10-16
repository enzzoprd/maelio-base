import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { dueLabel, homeworkQuery, isoDay, subjectsQuery, type Homework } from '@/lib/workspace';

export const Route = createFileRoute('/_authenticated/devoirs')({ head: () => pageHead('Mes devoirs', 'Une place pour vos prochaines échéances.'), component: HomeworkPage, pendingComponent: PageSkeleton });

function HomeworkPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery(homeworkQuery(user.id));
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [due, setDue] = useState(isoDay());
  const [subjectId, setSubjectId] = useState('');
  const [deleting, setDeleting] = useState<Homework | null>(null);
  const [busy, setBusy] = useState(false);

  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? null;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['homework', user.id] });
  const todo = items.filter(h => !h.done);
  const done = items.filter(h => h.done);

  function openCreate() { setEditing(null); setTitle(''); setDetails(''); setDue(isoDay()); setSubjectId(''); setOpen(true); }
  function openEdit(h: Homework) { setEditing(h); setTitle(h.title); setDetails(h.details); setDue(h.due_date); setSubjectId(h.subject_id ?? ''); setOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('Donne un titre au devoir.'); return; }
    if (!due) { toast.error('Choisis une date.'); return; }
    setBusy(true);
    const payload = { title: title.trim(), details, due_date: due, subject_id: subjectId || null };
    const { error } = editing
      ? await supabase.from('homework').update(payload).eq('id', editing.id)
      : await supabase.from('homework').insert({ ...payload, user_id: user.id });
    setBusy(false);
    if (error) { toast.error('Impossible d’enregistrer le devoir. Réessaie.'); return; }
    toast.success(editing ? 'Devoir modifié.' : 'Devoir ajouté.');
    setOpen(false);
    refresh();
  }

  async function toggle(h: Homework) {
    const { error } = await supabase.from('homework').update({ done: !h.done }).eq('id', h.id);
    if (error) { toast.error('Impossible de mettre à jour. Réessaie.'); return; }
    refresh();
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('homework').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) { toast.error('Impossible de supprimer le devoir. Réessaie.'); return; }
    toast.success('Devoir supprimé.');
    setDeleting(null);
    refresh();
  }

  const row = (h: Homework) => (
    <li key={h.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <Checkbox className="mt-1 h-5 w-5" checked={h.done} onCheckedChange={() => toggle(h)} aria-label={h.done ? `Marquer « ${h.title} » comme à faire` : `Marquer « ${h.title} » comme fait`}/>
      <div className="min-w-0 flex-1">
        <h3 className={`font-medium ${h.done ? 'text-muted-foreground line-through' : ''}`}>{h.title}</h3>
        <p className="text-xs text-muted-foreground">{subjectName(h.subject_id) ? `${subjectName(h.subject_id)} · ` : ''}{dueLabel(h.due_date)}</p>
        {h.details && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{h.details}</p>}
      </div>
      <Button variant="ghost" size="icon" onClick={() => openEdit(h)} aria-label={`Modifier ${h.title}`} title="Modifier"><Pencil size={16}/></Button>
      <Button variant="ghost" size="icon" onClick={() => setDeleting(h)} aria-label={`Supprimer ${h.title}`} title="Supprimer"><Trash2 size={16}/></Button>
    </li>
  );

  return (
    <div className="page">
      <div className="page-intro">
        <div><div className="eyebrow">MON ESPACE MAELIO</div><h1>Mes devoirs</h1><p className="intro-sub">Une place pour vos prochaines échéances.</p></div>
        <Button onClick={openCreate}><Plus/>Nouveau devoir</Button>
      </div>

      {items.length === 0 ? (
        <div className="empty-subjects"><div><ListTodo className="text-muted-foreground" size={40} strokeWidth={1.5}/><h2 className="empty-title">Aucun devoir pour l’instant</h2><p className="empty-copy">Vos devoirs et leurs échéances apparaîtront ici.</p><Button onClick={openCreate}><Plus/>Nouveau devoir</Button></div></div>
      ) : (
        <>
          <section><div className="section-heading"><h2>À faire</h2></div>
            {todo.length === 0 ? <p className="empty-copy">Tout est fait. Bravo.</p> : <ul className="grid gap-3" aria-label="Devoirs à faire">{todo.map(row)}</ul>}
          </section>
          {done.length > 0 && <section><div className="section-heading"><h2>Faits</h2></div><ul className="grid gap-3" aria-label="Devoirs faits">{done.map(row)}</ul></section>}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? 'Modifier le devoir' : 'Nouveau devoir'}</DialogTitle>
          <DialogDescription>Un exercice, une révision, un exposé…</DialogDescription>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="hw-title">Titre</Label><Input id="hw-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required autoFocus/></div>
            <div className="space-y-1.5"><Label htmlFor="hw-due">Pour le</Label><Input id="hw-due" type="date" value={due} onChange={e => setDue(e.target.value)} required/></div>
            {subjects.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="hw-subject">Matière (facultatif)</Label>
                <select id="hw-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Aucune matière</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="hw-details">Détails (facultatif)</Label><Textarea id="hw-details" value={details} onChange={e => setDetails(e.target.value)} rows={4}/></div>
            <Button type="submit" disabled={busy} className="w-full">{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer ce devoir ?</AlertDialogTitle>
          <AlertDialogDescription>« {deleting?.title} » sera supprimé définitivement.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
