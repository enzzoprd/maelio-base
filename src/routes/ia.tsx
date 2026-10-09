import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/ia')({ head: () => pageHead("Assistant IA", "Un espace pour vos questions et vos idées."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Assistant IA" subtitle="Un espace pour vos questions et vos idées." emptyTitle="Aucune conversation pour l’instant" description="L’assistant IA n’est pas encore connecté. Aucun message ne sera envoyé." icon="sparkles"/>; }
