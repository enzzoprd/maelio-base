import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/_authenticated/notes')({ head: () => pageHead("Notes", "Vos idées, vos cours, vos mots."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Notes" subtitle="Vos idées, vos cours, vos mots." emptyTitle="Aucune note pour l’instant" description="Vos notes apparaîtront ici lorsque votre espace sera connecté." icon="notes"/>; }
