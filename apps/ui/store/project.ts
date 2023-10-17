import { defineStore } from 'pinia';
import { RemovableRef, useLocalStorage } from '@vueuse/core/index';
import { Transaction } from '~/store/transaction';

export interface Project {
  project: string;
}

interface State {
  projects: RemovableRef<Project[]>;
}

export function getFullProjectName(
  t: Pick<Transaction, 'category'>,
): string | undefined {
  if (!t.category) return t.category;
  const [, projectName] = t.category.split('/');
  return projectName;
}

export const useProjectStore = defineStore('project', {
  state: (): State => ({
    projects: useLocalStorage<Project[]>('project', []),
  }),
  actions: {
    create(project: Project) {
      const projectIndex = this.$state.projects.findIndex(
        (a) => a.project === project.project,
      );

      if (projectIndex >= 0) {
        const existing = this.$state.projects[projectIndex];
        this.$state.projects.splice(
          projectIndex,
          1,
          Object.assign(existing, project),
        );
      } else {
        this.$state.projects.push(project);
      }
    },
  },
});
