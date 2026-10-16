import { useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileText, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { formatFileSize, subjectFilesQuery, subjectsQuery, type SubjectFile } from '@/lib/workspace';

export const Route = createFileRoute('/_authenticated/matieres/$subjectId')({
  head: () => pageHead('Matière', 'Les fichiers de ta matière.'),
  component: SubjectDetailPage,
  pendingComponent: PageSkeleton,
});

const MAX_SIZE = 50 * 1024 * 1024;

function SubjectDetailPage() {
  const { user } = Route.useRouteContext();
  const { subjectId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const { data: files = [] } = useQuery(subjectFilesQuery(user.id, subjectId));
  const subject = subjects.find(s => s.id === subjectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<SubjectFile | null>(null);

  function refresh() { queryClient.invalidateQueries({ queryKey: ['subject-files', user.id, subjectId] }); }

  async function upload(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { toast.error('Ce fichier dépasse 50 Mo. Choisis un fichier plus léger.'); return; }
    setBusy(true);
    const path = `${user.id}/${subjectId}/${crypto.randomUUID()}-${file.name}`;
    const { error: upError } = await supabase.storage.from('documents').upload(path, file);
    if (upError) { setBusy(false); toast.error('Impossible d’envoyer le fichier. Réessaie.'); return; }
    const { error } = await supabase.from('subject_files').insert({
      user_id: user.id, subject_id: subjectId, file_name: file.name,
      storage_path: path, size_bytes: file.size, mime_type: file.type || '',
    });
    setBusy(false);
    if (error) { toast.error('Le fichier est envoyé mais n’apparaît pas. Réessaie.'); return; }
    toast.success('Fichier ajouté.');
    if (inputRef.current) inputRef.current.value = '';
    refresh();
  }

  async function download(f: SubjectFile) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(f.storage_path, 300);
    if (error || !data) { toast.error('Impossible d’ouvrir le fichier. Réessaie.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    await supabase.storage.from('documents').remove([deleting.storage_path]);
    const { error } = await supabase.from('subject_files').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) { toast.error('Impossible de supprimer le fichier. Réessaie.'); return; }
    toast.success('Fichier supprimé.');
    setDeleting(null);
    refresh();
  }

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">MON ESPACE MAELIO</div>
          <h1>{subject?.name ?? 'Matière'}</h1>
          <p className="intro-sub">Les fichiers de cette matière, au même endroit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/matieres"><ArrowLeft/>Toutes les matières</Link></Button>
          <Button onClick={() => inputRef.current?.click()} disabled={busy}><Upload/>{busy ? 'Envoi en cours…' : 'Ajouter un fichier'}</Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label="Choisir un fichier à ajouter"
        onChange={e => upload(e.target.files)}
      />

      {files.length === 0 ? (
        <div className="empty-subjects">
          <div>
            <FileText className="mx-auto text-muted-foreground" size={40} aria-hidden/>
            <h2 className="empty-title">Aucun fichier pour l’instant</h2>
            <p className="empty-copy">Ajoute tes cours, tes exercices ou tes fiches ici.</p>
            <Button onClick={() => inputRef.current?.click()} disabled={busy}><Upload/>Ajouter un fichier</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Fichiers de la matière">
          {files.map(f => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <FileText className="shrink-0 text-muted-foreground" size={20} aria-hidden/>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.file_name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(f.size_bytes)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => download(f)} aria-label={`Ouvrir ${f.file_name}`} title="Ouvrir"><Download size={16}/></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(f)} aria-label={`Supprimer ${f.file_name}`} title="Supprimer"><Trash2 size={16}/></Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer « {deleting?.file_name} » ?</AlertDialogTitle>
          <AlertDialogDescription>Le fichier sera définitivement supprimé.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
