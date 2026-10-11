import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { frenchAuthError, profileQuery } from '@/lib/profile';
import { deleteMyAccount } from '@/lib/account.functions';

export const Route = createFileRoute('/_authenticated/parametres')({ head: () => pageHead('Paramètres', 'Ton compte et tes préférences.'), component: SettingsPage, pendingComponent: PageSkeleton });

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery(profileQuery(user.id));
  const [firstName, setFirstName] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const isEmailAccount = user.app_metadata?.provider === 'email';

  useEffect(() => { setFirstName(profile?.firstName ?? ''); }, [profile?.firstName]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const value = firstName.trim();
    if (!value) { toast.error('Indique ton prénom.'); return; }
    setBusy('name');
    const { error } = await supabase.from('profiles').update({ first_name: value }).eq('user_id', user.id);
    setBusy(null);
    if (error) toast.error('Impossible d’enregistrer ton prénom. Réessaie.');
    else { toast.success('Prénom enregistré.'); queryClient.invalidateQueries({ queryKey: ['profile', user.id] }); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) { toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy('pwd');
    const { error } = await supabase.auth.updateUser({ password: newPwd, current_password: currentPwd } as { password: string });
    setBusy(null);
    if (error) toast.error(frenchAuthError(error.message));
    else { toast.success('Mot de passe modifié.'); setCurrentPwd(''); setNewPwd(''); }
  }

  async function removeAccount() {
    setBusy('delete');
    try {
      await deleteMyAccount();
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: '/', replace: true });
    } catch {
      toast.error('La suppression a échoué. Réessaie plus tard.');
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <div className="page-intro"><div><div className="eyebrow">MON ESPACE MAELIO</div><h1>Paramètres</h1><p className="intro-sub">Ton compte et tes préférences.</p></div></div>
      <div className="grid max-w-2xl gap-6">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Profil</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connecté avec {user.email}</p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={saveName}>
            <div className="flex-1 space-y-1.5"><Label htmlFor="first-name">Prénom</Label><Input id="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" /></div>
            <Button type="submit" disabled={busy === 'name'}>Enregistrer</Button>
          </form>
        </section>

        {isEmailAccount && (
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Mot de passe</h2>
            <form className="mt-4 space-y-3" onSubmit={changePassword}>
              <div className="space-y-1.5"><Label htmlFor="current-password">Mot de passe actuel</Label><Input id="current-password" type="password" autoComplete="current-password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" autoComplete="new-password" value={newPwd} onChange={e => setNewPwd(e.target.value)} minLength={8} required /></div>
              <Button type="submit" disabled={busy === 'pwd'}>Changer le mot de passe</Button>
            </form>
          </section>
        )}

        <section className="rounded-lg border border-destructive/40 bg-card p-6">
          <h2 className="text-lg font-semibold">Supprimer mon compte</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ton compte et toutes tes données seront supprimés définitivement. Cette action est irréversible.</p>
          <Button variant="destructive" className="mt-4" onClick={() => { setConfirmText(''); setConfirmOpen(true); }}>Supprimer mon compte</Button>
        </section>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer définitivement ton compte ?</AlertDialogTitle>
          <AlertDialogDescription>Toutes tes données seront effacées. Écris SUPPRIMER pour confirmer.</AlertDialogDescription>
          <Label htmlFor="confirm-delete" className="sr-only">Confirmation</Label>
          <Input id="confirm-delete" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={confirmText.trim() !== 'SUPPRIMER' || busy === 'delete'} onClick={e => { e.preventDefault(); removeAccount(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
