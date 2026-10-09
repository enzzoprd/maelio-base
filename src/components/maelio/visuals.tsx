import { Home, Folder, Sparkles, NotebookPen, ScanLine, Repeat2, Calculator, ListTodo, Settings } from 'lucide-react';
import { Link } from '@tanstack/react-router';
export const icons = { home: Home, folder: Folder, sparkles: Sparkles, notes: NotebookPen, scan: ScanLine, transform: Repeat2, tools: Calculator, homework: ListTodo, settings: Settings };
export function Brand() {
  return <Link to="/" className="brand" aria-label="Maelio — Accueil"><svg className="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M5 28V10a3 3 0 0 1 5-2l8 9 8-9a3 3 0 0 1 5 2v18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="m18 25 4-5" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><span className="brand-name">Maelio</span></Link>;
}
export function FolderArt() {
  return <svg className="empty-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M17 16h13l5 6h17v27H12V22a6 6 0 0 1 5-6Z" fill="var(--illustration-fill)"/><path d="M13 26v-8a4 4 0 0 1 4-4h12l6 7h15a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4l-3-17a4 4 0 0 1 4-4h36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M27 35h11M32.5 29.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
export function PageSkeleton() {
  return <div className="page loading-page" role="status" aria-label="Chargement en cours" aria-busy="true"><span className="sr-only">Chargement en cours…</span><div className="skeleton skeleton-heading"/><div className="skeleton skeleton-text"/><div className="skeleton skeleton-area"/><div className="skeleton-columns"><div className="skeleton"/><div className="skeleton"/></div><div className="skeleton skeleton-text"/></div>;
}
