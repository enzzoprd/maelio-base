import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FolderArt, PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { subjectsQuery, type Subject } from '@/lib/workspace';

export const Route = createFileRoute('/_authenticated/matieres')({ head: () => pageHead('Matières', 'Tous vos cours, chacun à sa place.'), component: SubjectsPage, pendingComponent: PageSkeleton });

function SubjectsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() { setEditing(null); setName(''); setDialogOpen(true); }
  function openEdit(s: Subject) { setEditing(s); setName(s.name); setDialogOpen(true); }
  function refresh() { queryClient.invalidateQueries({ queryKey: ['subjects', user.id] }); }

  async function save(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) { toast.error('Donne un nom à ta matière.'); return; }
    setBusy(true);
    const { error } = editing
      ? await supabase.from('subjects').update({ name: value }).eq('id', editing.id)
      : await supabase.from('subjects').insert({ user_id: user.id, name: value });
    setBusy(false);
    if (error) { toast.error('Impossible d’enregistrer la matière. Réessaie.'); return; }
    toast.success(editing ? 'Matière renommée.' : 'Matière ajoutée.');
    setDialogOpen(false);
    refresh();
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('subjects').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) { toast.error('Impossible de supprimer la matière. Réessaie.'); return; }
    toast.success('Matière supprimée.');
    setDeleting(null);
    refresh();
  }

  return (
    <div className="page">
      <div className="page-intro">
        <div><div className="eyebrow">MON ESPACE MAELIO</div><h1>Matières</h1><p className="intro-sub">Tous vos cours, chacun à sa place.</p></div>
        <Button onClick={openCreate}><FolderPlus/>Ajouter une matière</Button>
      </div>

      {subjects.length === 0 ? (
        <div className="empty-subjects"><div><FolderArt/><h2 className="empty-title">Aucune matière pour l’instant</h2><p className="empty-copy">Votre prochain chapitre commence ici.</p><Button onClick={openCreate}><FolderPlus/>Ajouter une matière</Button></div></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mes matières">
          {subjects.map(s => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <FolderArt small/>
              <span className="flex-1 truncate font-medium">{s.name}</span>
              <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label={`Renommer ${s.name}`} title="Renommer"><Pencil size={16}/></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} aria-label={`Supprimer ${s.name}`} title="Supprimer"><Trash2 size={16}/></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editing ? 'Renommer la matière' : 'Nouvelle matière'}</DialogTitle>
          <DialogDescription>{editing ? 'Modifie le nom de ta matière.' : 'Par exemple : Mathématiques, Histoire, Anglais…'}</DialogDescription>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="subject-name">Nom de la matière</Label><Input id="subject-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus/></div>
            <Button type="submit" disabled={busy} className="w-full">{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer « {deleting?.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>La matière sera supprimée. Tes notes associées seront conservées.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
