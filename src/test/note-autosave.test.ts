import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNoteAutosave, type NoteDraft } from '@/lib/note-autosave';

const initial: NoteDraft = { title: 'Cours', content: 'Avant', subject_id: null };
afterEach(() => vi.useRealTimers());

describe('enregistrement automatique des notes', () => {
  it('conserve le titre, le contenu et la matière sans enregistrement manuel', async () => {
    vi.useFakeTimers();
    const write = vi.fn().mockResolvedValue(undefined);
    const saver = createNoteAutosave(initial, false, write, vi.fn());
    const next = { title: 'Révisions', content: 'Modifications conservées', subject_id: 'matiere-1' };
    saver.update(next);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(700);
    expect(write).toHaveBeenCalledExactlyOnceWith(next);
    expect(saver.dirty()).toBe(false);
  });

  it('enregistre immédiatement les modifications avant de quitter la page', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const saver = createNoteAutosave(initial, false, write, vi.fn());
    saver.update({ ...initial, content: 'Dernière frappe avant de partir' });
    await saver.flush();
    expect(write).toHaveBeenCalledExactlyOnceWith({ ...initial, content: 'Dernière frappe avant de partir' });
    expect(saver.dirty()).toBe(false);
  });

  it('sérialise les frappes pendant une requête pour conserver la dernière version', async () => {
    let finish: (() => void) | undefined;
    const write = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const saver = createNoteAutosave(initial, false, write, vi.fn());
    saver.update({ ...initial, content: 'Version 1' });
    const saving = saver.flush();
    saver.update({ ...initial, content: 'Version 2' });
    expect(write).toHaveBeenCalledTimes(1);
    finish?.();
    await saving;
    expect(write.mock.calls.map(([draft]) => draft.content)).toEqual(['Version 1', 'Version 2']);
    expect(saver.dirty()).toBe(false);
    saver.dispose();
  });

  it('garde les modifications après un échec pour permettre une nouvelle tentative', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('Hors ligne')).mockResolvedValue(undefined);
    const saver = createNoteAutosave(initial, false, write, vi.fn());
    saver.update({ ...initial, content: 'À conserver' });
    await expect(saver.flush()).rejects.toThrow('Hors ligne');
    expect(saver.dirty()).toBe(true);
    await saver.flush();
    expect(write).toHaveBeenLastCalledWith({ ...initial, content: 'À conserver' });
    expect(saver.dirty()).toBe(false);
  });

  it('ne crée pas de note vide et permet de vider une note existante', async () => {
    const empty = { title: '', content: '', subject_id: null };
    const write = vi.fn().mockResolvedValue(undefined);
    const fresh = createNoteAutosave(empty, true, write, vi.fn());
    fresh.update({ ...empty, title: ' ' });
    await fresh.flush();
    expect(write).not.toHaveBeenCalled();
    const existing = createNoteAutosave(initial, false, write, vi.fn());
    existing.update(empty);
    await existing.flush();
    expect(write).toHaveBeenCalledExactlyOnceWith(empty);
  });
});