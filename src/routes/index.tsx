import { createFileRoute, Link } from '@tanstack/react-router';
import { FolderOpen, NotebookPen, Sparkles, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';

export const Route = createFileRoute('/')({
  head: () => pageHead('Ton espace étudiant tout-en-un', 'Maelio réunit tes matières, notes, documents, devoirs et un assistant IA éducatif au même endroit.'),
  component: Landing,
});

const features = [
  { Icon: FolderOpen, title: 'Matières et dossiers', text: 'Range tes cours comme tu le souhaites.' },
  { Icon: NotebookPen, title: 'Notes et documents', text: 'Tout retrouver, au même endroit.' },
  { Icon: ListTodo, title: 'Devoirs', text: 'Garde un œil sur tes échéances.' },
  { Icon: Sparkles, title: 'IA éducative', text: 'Pour comprendre, pas pour tricher.' },
];

function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Brand />
        <Button variant="ghost" asChild><Link to="/connexion">Se connecter</Link></Button>
      </header>
      <section className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">Ton espace étudiant, à ton rythme.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">Matières, notes, documents et devoirs réunis dans une seule application simple et confortable à lire.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild><Link to="/connexion" search={{ mode: 'inscription' }}>Créer un compte</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/connexion">J’ai déjà un compte</Link></Button>
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-lg border bg-card p-4">
              <Icon className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
              <div><h2 className="font-semibold text-foreground">{title}</h2><p className="text-sm text-muted-foreground">{text}</p></div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
