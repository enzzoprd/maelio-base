import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brand } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { frenchAuthError, safeRedirect } from '@/lib/profile';

type Mode = 'connexion' | 'inscription' | 'oubli';
export const Route = createFileRoute('/connexion')({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined; redirect?: string | undefined } => {
    const mode = s['mode'];
    const redirect = s['redirect'];
    return {
      mode: mode === 'inscription' || mode === 'oubli' ? mode : undefined,
      redirect: typeof redirect === 'string' ? redirect : undefined,
    };
  },
  head: () => pageHead('Connexion', 'Connecte-toi ou crée ton compte Maelio.'),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safeRedirect(search.redirect);
  const [mode, setMode] = useState<Mode>(search.mode ?? 'connexion');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | 'confirm' | 'reset'>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target, replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === 'inscription') {
        if (!firstName.trim()) { setError('Indique ton prénom.'); return; }
        if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/accueil', data: { first_name: firstName.trim() } } });
        if (error) setError(frenchAuthError(error.message)); else setSent('confirm');
      } else if (mode === 'oubli') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reinitialiser-mot-de-passe' });
        if (error) setError(frenchAuthError(error.message)); else setSent('reset');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(frenchAuthError(error.message));
      }
    } finally { setBusy(false); }
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin + '/connexion' });
    if (result.error) setError('La connexion avec Google a échoué. Réessaie.');
  }

  const titles: Record<Mode, string> = { connexion: 'Content de te revoir', inscription: 'Crée ton compte', oubli: 'Mot de passe oublié' };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="text-center" role="status">
              <MailCheck className="mx-auto mb-3 text-primary" size={32} aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">Vérifie ta boîte mail</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {sent === 'confirm' ? `Nous avons envoyé un lien de confirmation à ${email}. Clique dessus pour activer ton compte.` : `Si un compte existe pour ${email}, tu vas recevoir un lien pour choisir un nouveau mot de passe.`}
              </p>
              <Button variant="link" className="mt-4" onClick={() => { setSent(null); setMode('connexion'); }}>Retour à la connexion</Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">{titles[mode]}</h1>
              {mode !== 'oubli' && (
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Type d’accès">
                  {(['connexion', 'inscription'] as const).map(m => (
                    <Button key={m} type="button" role="tab" aria-selected={mode === m} variant={mode === m ? 'secondary' : 'ghost'} className={mode === m ? 'bg-card shadow-sm' : ''} onClick={() => { setMode(m); setError(null); }}>
                      {m === 'connexion' ? 'Connexion' : 'Inscription'}
                    </Button>
                  ))}
                </div>
              )}
              <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
                {mode === 'inscription' && (
                  <div className="space-y-1.5"><Label htmlFor="prenom">Prénom</Label><Input id="prenom" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={60} /></div>
                )}
                <div className="space-y-1.5"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                {mode !== 'oubli' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="password">Mot de passe</Label>
                      {mode === 'connexion' && <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => { setMode('oubli'); setError(null); }}>Oublié ?</Button>}
                    </div>
                    <Input id="password" type="password" autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} aria-describedby={mode === 'inscription' ? 'pwd-hint' : undefined} />
                    {mode === 'inscription' && <p id="pwd-hint" className="text-xs text-muted-foreground">Au moins 8 caractères.</p>}
                  </div>
                )}
                {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Un instant…' : mode === 'inscription' ? 'Créer mon compte' : mode === 'oubli' ? 'Recevoir le lien' : 'Se connecter'}
                </Button>
              </form>
              {mode === 'oubli' ? (
                <Button variant="link" className="mt-3 w-full" onClick={() => setMode('connexion')}>Retour à la connexion</Button>
              ) : (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
                  <Button type="button" variant="outline" className="w-full" onClick={google}>Continuer avec Google</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
