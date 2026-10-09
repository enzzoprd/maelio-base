import { createFileRoute } from '@tanstack/react-router';
import { FeaturePage } from '@/components/maelio/feature-page';
import { PageSkeleton } from '@/components/maelio/visuals';
import { pageHead } from '@/lib/maelio';
export const Route = createFileRoute('/parametres')({ head: () => pageHead("Paramètres", "Votre espace, vos préférences."), component: SectionPage, pendingComponent: PageSkeleton });
function SectionPage() { return <FeaturePage title="Paramètres" subtitle="Votre espace, vos préférences." emptyTitle="Aucun compte connecté" description="Votre prénom et vos préférences apparaîtront ici une fois votre compte connecté." icon="settings"/>; }
