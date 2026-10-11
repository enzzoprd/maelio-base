import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brand } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { frenchAuthError } from '@/lib/profile';

export const Route = createFileRoute('/reinitialiser-mot-de-passe')({
  head: () => pageHead('Nouveau mot de passe', 'Choisis un nouveau mot de passe pour ton compte Maelio.'),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setReady(true); });
    if (window.location.hash.includes('type=recovery')) setReady(true);
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(frenchAuthError(error.message)); else navigate({ to: '/accueil', replace: true });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Nouveau mot de passe</h1>
          {ready ? (
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div className="space-y-1.5"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></div>
              {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un instant…' : 'Enregistrer'}</Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Ce lien est invalide ou a expiré. <Link to="/connexion" search={{ mode: 'oubli' }} className="font-medium text-primary underline">Demander un nouveau lien</Link></p>
          )}
        </div>
      </div>
    </main>
  );
}
