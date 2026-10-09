import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/transformer')({ head: () => pageHead("Transformer", "Un nouvel espace pour vos documents."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Transformer" subtitle="Un nouvel espace pour vos documents." emptyTitle="Aucune transformation pour l’instant" description="La transformation de documents n’est pas encore disponible." icon="transform"/>; }
