import type { SaveState } from '@/lib/note-autosave';

export type KeyPoint = { term: string; definition: string };
export type MemoDraft = { title: string; chapter: string; summary: string; key_points: KeyPoint[]; subject_id: string | null };

const sameDraft = (a: MemoDraft, b: MemoDraft) => JSON.stringify(a) === JSON.stringify(b);

/** Version propre envoyée à la base : textes nettoyés, lignes vides retirées. */
export function cleanMemoDraft(d: MemoDraft): MemoDraft {
  return {
    title: d.title.trim(),
    chapter: d.chapter.trim(),
    summary: d.summary,
    subject_id: d.subject_id,
    key_points: d.key_points
      .map(p => ({ term: p.term.trim(), definition: p.definition.trim() }))
      .filter(p => p.term || p.definition),
  };
}

const isBlank = (d: MemoDraft) => !d.title && !d.chapter && !d.summary.trim() && d.key_points.length === 0;

/** Une file par éditeur : les anciennes écritures se terminent avant les nouvelles. */
export function createMemoAutosave(
  initial: MemoDraft,
  isNew: boolean,
  write: (draft: MemoDraft) => Promise<void>,
  onState: (state: SaveState) => void,
  delay = 700,
) {
  let draft = initial;
  let revision = 0;
  let savedRevision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  let persisted = !isNew;
  const dirty = () => revision !== savedRevision;

  async function drain() {
    while (dirty()) {
      const snapshot = cleanMemoDraft(draft);
      const version = revision;
      if (!persisted && isBlank(snapshot)) {
        savedRevision = version;
        onState('saved');
        continue;
      }
      onState('saving');
      try {
        await write(snapshot);
        persisted = true;
        savedRevision = version;
      } catch (error) {
        onState('error');
        throw error;
      }
    }
    onState('saved');
  }

  function flush(): Promise<void> {
    clearTimeout(timer);
    if (running) return running;
    if (!dirty()) return Promise.resolve();
    running = drain().finally(() => { running = undefined; });
    return running;
  }

  return {
    dirty,
    flush,
    update(next: MemoDraft) {
      if (sameDraft(next, draft)) return;
      draft = next;
      revision += 1;
      onState('pending');
      clearTimeout(timer);
      timer = setTimeout(() => { void flush().catch(() => undefined); }, delay);
    },
    dispose() { clearTimeout(timer); },
  };
}
