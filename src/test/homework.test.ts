import { describe, expect, it } from 'vitest';
import { dueLabel, upcomingHomework, type Homework } from '@/lib/workspace';
const h = (id: string, due_date: string, done = false): Homework => ({ id, title: id, details: '', due_date, subject_id: null, done });
describe('devoirs', () => {
  it('à venir exclut les devoirs faits et passés, triés par date', () => {
    const r = upcomingHomework([h('c', '2026-10-20'), h('a', '2026-10-15'), h('x', '2026-10-14'), h('d', '2026-10-16', true)], '2026-10-15');
    expect(r.map(x => x.id)).toEqual(['a', 'c']);
  });
  it('libellés aujourd’hui / demain / en retard', () => {
    expect(dueLabel('2026-10-15', '2026-10-15')).toBe('Pour aujourd’hui');
    expect(dueLabel('2026-10-16', '2026-10-15')).toBe('Pour demain');
    expect(dueLabel('2026-10-10', '2026-10-15')).toMatch(/^En retard/);
  });
});
