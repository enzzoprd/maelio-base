export type StudentProfile = { firstName: string | null };
export const initialProfile: StudentProfile = { firstName: null };
export function accountLabel(profile: StudentProfile) {
  return profile.firstName?.trim() || 'Non connecté';
}
export const emptyWorkspace = { subjects: [], files: [], notes: [], homework: [] };
export const sections = [
  { path: '/accueil', label: 'Accueil', icon: 'home' },
  { path: '/matieres', label: 'Matières', icon: 'folder' },
  { path: '/ia', label: 'IA', icon: 'sparkles' },
  { path: '/notes', label: 'Notes', icon: 'notes' },
  { path: '/scanner', label: 'Scanner', icon: 'scan' },
  { path: '/transformer', label: 'Transformer', icon: 'transform' },
  { path: '/outils', label: 'Formules & Outils', icon: 'tools' },
  { path: '/devoirs', label: 'Mes devoirs', icon: 'homework' },
  { path: '/parametres', label: 'Paramètres', icon: 'settings' },
] as const;
export type SectionPath = typeof sections[number]['path'];
export function pageHead(title: string, description: string) {
  return { meta: [ { title: `${title} — Maelio` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — Maelio` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' } ] };
}
