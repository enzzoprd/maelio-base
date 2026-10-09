import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/outils')({ head: () => pageHead("Formules & Outils", "Un espace pour les essentiels de vos cours."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Formules & Outils" subtitle="Un espace pour les essentiels de vos cours." emptyTitle="Aucun outil disponible pour l’instant" description="Les formules et les outils seront disponibles dans une prochaine étape." icon="tools"/>; }
