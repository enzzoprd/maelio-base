import { describe, expect, it } from 'vitest';
import { accountLabel, initialProfile, emptyWorkspace, sections } from '@/lib/maelio';
import { safeRedirect } from '@/lib/profile';
import { createRouter, rootRouteId } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
describe('Maelio workspace rules', () => {
  it('starts with no subjects, files, notes or homework', () => {
    expect(emptyWorkspace).toEqual({ subjects: [], files: [], notes: [], homework: [] });
  });
  it('never invents a first name when the profile has none', () => {
    expect(initialProfile.firstName).toBeNull();
    expect(accountLabel(initialProfile)).toBe('Mon profil');
    expect(accountLabel({ firstName: '  ' })).toBe('Mon profil');
  });
  it('uses the first name from the real profile', () => {
    expect(accountLabel({ firstName: '  Camille  ' })).toBe('Camille');
  });
  it('only redirects to same-site pages after sign-in', () => {
    expect(safeRedirect('/notes')).toBe('/notes');
    expect(safeRedirect('//evil.com')).toBe('/accueil');
    expect(safeRedirect('https://evil.com')).toBe('/accueil');
    expect(safeRedirect(undefined)).toBe('/accueil');
  });
  it('keeps every section behind sign-in', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(sections).toHaveLength(9);
    for (const section of sections) {
      const id = router.matchRoutes(section.path).at(-1)?.routeId;
      expect(id).toBe(`/_authenticated${section.path}`);
      expect(id).not.toBe(rootRouteId);
    }
  });
});
