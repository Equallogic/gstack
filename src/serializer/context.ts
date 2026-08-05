import type { GeneratorProject, ListId } from '@/model/types';

/** Lookup helpers the emitters need while serializing. */
export interface SerializeContext {
  project: GeneratorProject;
  /** listId -> emitted Perchance list name. */
  nameOf(listId: ListId): string;
}

export function makeSerializeContext(project: GeneratorProject): SerializeContext {
  return {
    project,
    nameOf(listId: ListId): string {
      return project.lists[listId]?.name ?? listId;
    },
  };
}
