import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/devoirs')({ head: () => pageHead("Mes devoirs", "Une place pour vos prochaines échéances."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Mes devoirs" subtitle="Une place pour vos prochaines échéances." emptyTitle="Aucun devoir pour l’instant" description="Vos devoirs et leurs échéances apparaîtront ici." icon="homework"/>; }
