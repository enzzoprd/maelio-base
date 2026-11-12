/** Crédits IA gratuits par jour (le palier Premium viendra plus tard). */
export const DAILY_FREE_CREDITS = 5;

/** Date du jour à Paris, au format AAAA-MM-JJ : c'est la journée utilisée pour compter les crédits. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
