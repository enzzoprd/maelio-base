import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, ScanText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { subjectsQuery } from '@/lib/workspace';
import { DAILY_FREE_CREDITS, parisToday } from '@/lib/credits';
import { scanDocument } from '@/lib/scanner.functions';

export const Route = createFileRoute('/_authenticated/scanner')({
  head: () => pageHead('Scanner', 'Photographie un document et récupère son texte.'),
  component: ScannerPage,
  pendingComponent: PageSkeleton,
});

type UsageClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: { used: number } | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

const creditsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['ai-credits', userId],
    queryFn: async (): Promise<number> => {
      const client = supabase as unknown as UsageClient;
      const { data, error } = await client.from('ai_credit_usage').select('used').eq('user_id', userId).eq('day', parisToday()).maybeSingle();
      if (error) throw new Error(error.message);
      return Math.max(DAILY_FREE_CREDITS - (data?.used ?? 0), 0);
    },
  });

/** Réduit la photo (1600 px max) puis l'encode en JPEG : envoi plus rapide et moins de données transmises. */
async function toJpegBase64(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Ton navigateur ne peut pas préparer cette image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82).split(',')[1] ?? '';
}

function ScannerPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: credits } = useQuery(creditsQuery(user.id));
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(next: File | undefined) {
    if (!next) return;
    if (!next.type.startsWith('image/')) { setError('Choisis une image (photo ou capture d’écran).'); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setText('');
    setScanned(false);
    setSavedNote(false);
    setError(null);
  }

  async function extract() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setSavedNote(false);
    try {
      const imageBase64 = await toJpegBase64(file);
      const result = await scanDocument({ data: { imageBase64, mimeType: 'image/jpeg' } });
      setText(result.text);
      setScanned(true);
      queryClient.setQueryData(['ai-credits', user.id], result.remaining);
      if (!result.text.trim()) toast.info('Aucun texte lisible détecté sur cette image.');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Le scan a échoué. Réessaie.');
      void queryClient.invalidateQueries({ queryKey: ['ai-credits', user.id] });
    } finally {
      setBusy(false);
    }
  }

  async function saveAsNote() {
    const content = text.trim();
    if (!content || saving) return;
    setSaving(true);
    const firstLine = content.split('\n')[0]?.slice(0, 80) ?? '';
    const title = noteTitle.trim() || firstLine || 'Scan';
    const { error: insertError } = await supabase.from('notes').insert({ user_id: user.id, title, content, subject_id: subjectId || null });
    setSaving(false);
    if (insertError) { toast.error('Impossible d’enregistrer la note. Réessaie.'); return; }
    setSavedNote(true);
    toast.success('Note enregistrée.');
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  async function copyText() {
    try { await navigator.clipboard.writeText(text); toast.success('Texte copié.'); }
    catch { toast.error('Copie impossible : sélectionne le texte et copie-le à la main.'); }
  }

  const noCredits = credits !== undefined && credits <= 0;

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">MON ESPACE MAELIO</div>
          <h1>Scanner</h1>
          <p className="intro-sub">Photographie un document et récupère son texte.</p>
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          {credits === undefined ? 'Crédits du jour…' : `Crédits du jour : ${credits} / ${DAILY_FREE_CREDITS}`}
        </p>
      </div>

      <div className="space-y-4">
        <input ref={fileInput} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Prendre une photo ou choisir une image" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }}/>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={file ? 'outline' : 'default'} onClick={() => fileInput.current?.click()} disabled={busy}>
            <Camera/>{file ? 'Changer d’image' : 'Prendre une photo ou choisir une image'}
          </Button>
          {file && <Button type="button" onClick={() => void extract()} disabled={busy || noCredits}><ScanText/>{busy ? 'Lecture en cours…' : 'Extraire le texte (1 crédit)'}</Button>}
        </div>
        {noCredits && <p className="text-sm text-muted-foreground" role="status">Tu as utilisé tous tes crédits du jour. Ils reviennent demain.</p>}
        {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {preview && <img src={preview} alt="Aperçu du document à scanner" className="max-h-72 rounded-md border object-contain"/>}
        {!file && <p className="text-sm text-muted-foreground">L’image est envoyée à Google (Gemini) pour être lue, puis n’est pas conservée par Maelio.</p>}

        {scanned && (
          <section className="space-y-3 rounded-lg border bg-card p-4" aria-label="Texte extrait">
            <Label htmlFor="scan-text">Texte extrait (tu peux le corriger)</Label>
            <Textarea id="scan-text" value={text} onChange={e => { setText(e.target.value); setSavedNote(false); }} rows={10}/>
            {text.trim() && (
              <div className="space-y-3">
                <div className="space-y-1.5"><Label htmlFor="scan-title">Titre de la note (facultatif)</Label><Input id="scan-title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} maxLength={120}/></div>
                {subjects.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="scan-subject">Matière (facultatif)</Label>
                    <select id="scan-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">Aucune matière</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void saveAsNote()} disabled={saving || savedNote}>{savedNote ? 'Note enregistrée' : saving ? 'Enregistrement…' : 'Enregistrer comme note'}</Button>
                  <Button type="button" variant="outline" onClick={() => void copyText()}>Copier le texte</Button>
                  {savedNote && <Button variant="link" asChild><Link to="/notes">Voir mes notes</Link></Button>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
