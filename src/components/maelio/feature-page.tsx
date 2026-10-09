import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { icons } from './visuals';
export function UnavailableAction({ label = 'Ajouter une matière' }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => setOpen(true)}><span aria-hidden="true">+</span>{label}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Pas encore disponible</DialogTitle><DialogDescription>La création et l’enregistrement seront disponibles lorsque votre espace Maelio sera connecté. Rien n’a été ajouté.</DialogDescription><Button onClick={() => setOpen(false)}>Compris</Button></DialogContent></Dialog></>;
}
export function FeaturePage({ title, subtitle, emptyTitle, description, icon, action }: { title: string; subtitle: string; emptyTitle: string; description: string; icon: keyof typeof icons; action?: string }) {
  const Icon = icons[icon];
  return <div className="page"><div className="page-intro"><div><div className="eyebrow">MON ESPACE MAELIO</div><h1>{title}</h1><p className="intro-sub">{subtitle}</p></div></div><div className="feature-empty"><div><div className="empty-icon"><Icon size={28} strokeWidth={1.4}/></div><h2 className="empty-title">{emptyTitle}</h2><p className="empty-copy">{description}</p>{action && <div className="mt-6"><UnavailableAction label={action}/></div>}</div></div></div>;
}
