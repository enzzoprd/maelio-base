import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, FileText, NotebookPen, ListTodo, Sparkles, ScanLine, Repeat2, Calculator, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderArt, PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
import { useQuery } from '@tanstack/react-query';
import { profileQuery } from '@/lib/profile';
import { formatDate, notesQuery, subjectsQuery } from '@/lib/workspace';

export const Route = createFileRoute('/_authenticated/accueil')({ head: () => pageHead('Accueil', 'Votre espace étudiant Maelio : matières, notes, fichiers et devoirs réunis au même endroit.'), component: HomePage, pendingComponent: PageSkeleton });
const shortcuts = [ { path: '/ia', label: 'Assistant IA', Icon: Sparkles, tone: 'ai' }, { path: '/scanner', label: 'Scanner', Icon: ScanLine, tone: 'scan' }, { path: '/transformer', label: 'Transformer', Icon: Repeat2, tone: 'transform' }, { path: '/outils', label: 'Formules & Outils', Icon: Calculator, tone: 'tools' } ] as const;

function HomePage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: subjects = [] } = useQuery(subjectsQuery(user.id));
  const { data: notes = [] } = useQuery(notesQuery(user.id));
  const name = profile?.firstName?.trim();
  return <div className="page"><div className="page-intro"><div><div className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-primary"/> VOTRE ESPACE ÉTUDIANT</div><h1>{name ? `Bonjour ${name}` : 'Bienvenue sur Maelio'}</h1><p className="intro-sub">Un espace pour apprendre. À votre rythme.</p></div><svg className="intro-decoration" viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M23 60c-10-21 0-36 17-40 7 18 2 29-13 36M35 62c-3-23 12-33 29-30-1 19-12 27-25 27M29 64l8-26M35 63l17-17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
    <section><div className="section-heading"><h2>Mes matières</h2><Button variant="link" size="sm" asChild><Link to="/matieres">Tout voir<ArrowUpRight/></Link></Button></div>
      {subjects.length === 0 ? (
        <div className="empty-subjects"><div><FolderArt/><h3 className="empty-title">Aucune matière pour l’instant</h3><p className="empty-copy">Votre prochain chapitre commence ici.</p><Button asChild><Link to="/matieres">Ajouter une matière</Link></Button></div></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mes matières">
          {subjects.slice(0, 6).map(s => <li key={s.id} className="flex items-center gap-3 rounded-lg border bg-card p-4"><FolderArt small/><span className="truncate font-medium">{s.name}</span></li>)}
        </ul>
      )}
    </section>
    <div className="recent-grid"><section><div className="section-heading"><h2>Fichiers récents</h2><Button variant="ghost" size="icon" asChild title="Voir les fichiers de mes matières"><Link to="/matieres" aria-label="Voir les fichiers de mes matières"><ArrowUpRight/></Link></Button></div><div className="recent-empty"><span className="recent-icon"><FileText size={19} strokeWidth={1.5}/></span><div><h3 className="empty-title">Aucun fichier récent</h3><p className="empty-copy">Vos documents trouveront leur place ici.</p></div></div></section>
    <section><div className="section-heading"><h2>Notes récentes</h2><Button variant="ghost" size="icon" asChild title="Voir toutes les notes"><Link to="/notes" aria-label="Voir toutes les notes"><ArrowUpRight/></Link></Button></div>
      {notes.length === 0 ? (
        <div className="recent-empty"><span className="recent-icon"><NotebookPen size={19} strokeWidth={1.5}/></span><div><h3 className="empty-title">Aucune note pour l’instant</h3><p className="empty-copy">Une place pour vos idées et vos cours.</p></div></div>
      ) : (
        <ul className="space-y-2" aria-label="Notes récentes">
          {notes.slice(0, 3).map(n => <li key={n.id} className="rounded-lg border bg-card p-3"><Link to="/notes" className="block"><span className="block truncate font-medium">{n.title || 'Sans titre'}</span><span className="text-xs text-muted-foreground">Modifiée le {formatDate(n.updated_at)}</span></Link></li>)}
        </ul>
      )}
    </section></div>
    <section className="quick-section"><div className="section-heading"><h2>À portée de main</h2></div><div className="quick-grid">{shortcuts.map(item => <Link key={item.path} to={item.path} className="quick-card"><span className={`quick-icon tone-${item.tone}`}><item.Icon/></span><span>{item.label}</span><ArrowUpRight/></Link>)}</div></section>
    <section className="homework"><div className="section-heading"><h2>Devoirs à venir</h2><Button variant="link" size="sm" asChild><Link to="/devoirs">Mes devoirs<ArrowUpRight/></Link></Button></div><div className="homework-empty"><ListTodo size={19} strokeWidth={1.5}/><span>Aucun devoir à venir. L’esprit tranquille.</span></div></section><div className="page-footer"><Leaf size={12} strokeWidth={1.5}/><span>Un peu d’ordre, plus de sérénité.</span></div>
  </div>;
}
