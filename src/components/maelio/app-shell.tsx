import { useState, type ReactNode } from 'react';
import { Link, Outlet, useNavigate, useRouteContext, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { profileQuery } from '@/lib/profile';
import { PanelLeftClose, PanelLeftOpen, Search, Sparkles, UserRound, MoreHorizontal, ChevronDown, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sections, initialProfile, accountLabel } from '@/lib/maelio';
import { useAvatarUrl, searchQuery } from '@/lib/workspace';

function Initial({ name, avatarUrl }: { name: string | null; avatarUrl?: string | null }) {
  const signed = useAvatarUrl(avatarUrl);
  if (signed) return <img src={signed} alt="" className="avatar object-cover" />;
  const letter = name?.trim()?.[0]?.toUpperCase();
  return <span className="avatar" aria-hidden="true">{letter ?? <UserRound size={18}/>}</span>;
}
import { Brand, icons } from './visuals';

function Onboarding({ userId, open, onDone }: { userId: string; open: boolean; onDone: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    const value = firstName.trim();
    if (!value) { toast.error('Indique ton prénom pour continuer.'); return; }
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ first_name: value, onboarded_at: new Date().toISOString() }).eq('user_id', userId);
    setBusy(false);
    if (error) { toast.error('Impossible d’enregistrer ton prénom. Réessaie.'); return; }
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogTitle>Bienvenue sur Maelio</DialogTitle>
        <DialogDescription>Ton espace étudiant est prêt. Une dernière chose : comment t’appelles-tu ?</DialogDescription>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-first-name">Ton prénom</Label>
          <Input id="onboarding-first-name" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" autoFocus />
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">C’est parti</Button>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { user } = useRouteContext({ from: '/_authenticated' });
  const { data: profile = initialProfile } = useQuery(profileQuery(user.id));
  const trimmedQuery = query.trim();
  const { data: results, isFetching: searching } = useQuery(searchQuery(user.id, trimmedQuery));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const needsOnboarding = profile !== initialProfile && !profile.onboardedAt;
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: '/connexion', replace: true });
  }
  const AccountMenu = ({ children, label }: { children: ReactNode; label: string }) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={label} title={label}>{children}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel className="truncate">{profile.firstName?.trim() || user.email}</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem asChild><Link to="/parametres"><Settings/>Profil et paramètres</Link></DropdownMenuItem><DropdownMenuItem onSelect={signOut}><LogOut/>Se déconnecter</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => sections.filter((_, index) => !mobile || index > 3).map(item => {
    const Icon = icons[item.icon];
    return <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)} title={item.label} aria-current={pathname === item.path ? 'page' : undefined} className={`nav-item ${pathname === item.path ? 'active' : ''}`}><Icon/>{(!collapsed || mobile) && <span>{item.label}</span>}</Link>;
  });
  return <div className="app-shell"><a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-card p-3">Aller au contenu</a>
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Navigation principale"><div className="brand-wrap"><Brand/></div><div className="nav-caption">{collapsed ? '•••' : 'MON ESPACE'}</div><nav className="side-nav"><NavLinks/></nav><div className="sidebar-footer"><div className="account-row"><Initial name={profile.firstName} avatarUrl={profile.avatarUrl}/>{!collapsed && <><div className="account-copy"><strong>{accountLabel(profile)}</strong><span>Mon compte</span></div><AccountMenu label="Menu du compte"><ChevronDown size={15}/></AccountMenu></>}</div></div></aside>
    <div className={`main-shell ${collapsed ? 'mini' : ''}`}><header className="topbar"><Button variant="ghost" size="icon" className="desktop-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Développer la navigation' : 'Réduire la navigation'} title={collapsed ? 'Développer la navigation' : 'Réduire la navigation'}>{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</Button><div className="mobile-brand"><Brand/></div><form className="search-trigger" onSubmit={e => { e.preventDefault(); setSearchOpen(true); }}><Button size="icon" variant="ghost" aria-label="Rechercher" title="Rechercher" onClick={() => setSearchOpen(true)} type="button"><Search size={18}/></Button><input aria-label="Rechercher dans mon espace" placeholder="Rechercher dans mon espace…" value={query} onChange={e => setQuery(e.target.value)}/></form><div className="top-actions"><Button variant="outline" asChild><Link to="/ia" aria-label="Ouvrir l’IA"><Sparkles/><span className="top-ai-label">Assistant IA</span></Link></Button><span className="top-divider"/><AccountMenu label="Ouvrir mon compte"><Initial name={profile.firstName} avatarUrl={profile.avatarUrl}/></AccountMenu></div></header><main id="contenu" tabIndex={-1}><Outlet/></main></div>
    <nav className="mobile-nav" aria-label="Navigation mobile">{sections.slice(0,4).map(item => { const Icon = icons[item.icon]; return <Link key={item.path} to={item.path} className={pathname === item.path ? 'active' : ''} aria-current={pathname === item.path ? 'page' : undefined}><Icon/><span>{item.label}</span></Link>; })}<Button variant="ghost" onClick={() => setMoreOpen(true)} className={sections.slice(4).some(s => s.path === pathname) ? 'active' : ''}><MoreHorizontal/><span>Plus</span></Button></nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}><DialogContent><DialogTitle>Mon espace Maelio</DialogTitle><DialogDescription>Toutes les rubriques</DialogDescription><nav className="more-links" aria-label="Autres rubriques"><NavLinks mobile/></nav></DialogContent></Dialog>
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent><DialogTitle>Rechercher dans Maelio</DialogTitle><DialogDescription>Matières et notes</DialogDescription><input className="h-11 rounded-md border bg-background px-3" aria-label="Votre recherche" placeholder="Que recherchez-vous ?" value={query} onChange={e => setQuery(e.target.value)} autoFocus/><div className="search-results" aria-live="polite">{!trimmedQuery ? <><Search className="text-muted-foreground"/><p className="empty-title">Recherchez dans votre espace</p><p className="empty-copy">Tapez un mot pour retrouver vos matières et vos notes.</p></> : searching ? <p className="empty-copy">Recherche en cours…</p> : results && (results.subjects.length > 0 || results.notes.length > 0) ? <>{results.subjects.length > 0 && <div className="search-group"><p className="search-group-title">Matières</p>{results.subjects.map(s => <Link key={s.id} to="/matieres/$subjectId" params={{ subjectId: s.id }} onClick={() => setSearchOpen(false)} className="search-result"><FolderArt name={s.name}/><span>{s.name}</span></Link>)}</div>}{results.notes.length > 0 && <div className="search-group"><p className="search-group-title">Notes</p>{results.notes.map(n => <Link key={n.id} to="/notes" onClick={() => setSearchOpen(false)} className="search-result"><span className="search-result-title">{n.title || 'Sans titre'}</span>{n.content && <span className="search-result-excerpt">{n.content.slice(0, 80)}</span>}</Link>)}</div>}</> : <><Search className="text-muted-foreground"/><p className="empty-title">Aucun résultat</p><p className="empty-copy">Aucune matière ni aucune note ne correspond à « {trimmedQuery} ».</p><Button variant="link" asChild><Link to="/matieres" onClick={() => setSearchOpen(false)}>Mes matières<ArrowUpRight/></Link></Button></>}</div></DialogContent></Dialog>
    <Onboarding userId={user.id} open={needsOnboarding} onDone={() => queryClient.invalidateQueries({ queryKey: ['profile', user.id] })}/>
  </div>;
}
