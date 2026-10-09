import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/matieres')({ head: () => pageHead("Matières", "Tous vos cours, chacun à sa place."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Matières" subtitle="Tous vos cours, chacun à sa place." emptyTitle="Aucune matière pour l’instant" description="Vos matières et leurs fichiers apparaîtront ici." icon="folder" action="Ajouter une matière"/>; }
