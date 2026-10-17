export type NoteDraft = { title: string; content: string; subject_id: string | null };
export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

/** One queue per editor: older writes must finish before newer writes start. */
export function createNoteAutosave(
  initial: NoteDraft,
  isNew: boolean,
  write: (draft: NoteDraft) => Promise<void>,
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
      const snapshot = { ...draft, title: draft.title.trim() };
      const version = revision;
      if (!persisted && !snapshot.title && !snapshot.content.trim()) {
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
    update(next: NoteDraft) {
      if (next.title === draft.title && next.content === draft.content && next.subject_id === draft.subject_id) return;
      draft = next;
      revision += 1;
      onState('pending');
      clearTimeout(timer);
      timer = setTimeout(() => { void flush().catch(() => undefined); }, delay);
    },
    dispose() { clearTimeout(timer); },
  };
}