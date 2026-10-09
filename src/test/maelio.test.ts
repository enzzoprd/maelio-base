import { describe, expect, it } from 'vitest';
import { accountLabel, initialProfile, emptyWorkspace, sections } from '@/lib/maelio';
import { createRouter, rootRouteId } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
describe('Maelio workspace rules', () => {
  it('starts with no subjects, files, notes or homework', () => {
    expect(emptyWorkspace).toEqual({ subjects: [], files: [], notes: [], homework: [] });
  });
  it('never invents a first name for an unconnected account', () => {
    expect(initialProfile.firstName).toBeNull();
    expect(accountLabel(initialProfile)).toBe('Non connecté');
    expect(accountLabel({ firstName: '  ' })).toBe('Non connecté');
  });
  it('uses the supplied student first name when available', () => {
    expect(accountLabel({ firstName: '  Camille  ' })).toBe('Camille');
  });
  it('provides a real page for every navigation destination', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(sections).toHaveLength(9);
    for (const section of sections) {
      expect(router.matchRoutes(section.path).at(-1)?.routeId).toBe(section.path);
      expect(router.matchRoutes(section.path).at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });
});
