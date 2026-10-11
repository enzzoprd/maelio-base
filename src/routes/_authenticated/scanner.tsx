import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/_authenticated/scanner')({ head: () => pageHead("Scanner", "Vos documents, au même endroit."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Scanner" subtitle="Vos documents, au même endroit." emptyTitle="Aucun document scanné" description="Le scanner n’est pas encore disponible. Aucun document n’a été traité." icon="scan"/>; }
