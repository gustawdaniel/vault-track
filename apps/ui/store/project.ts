import { defineStore } from 'pinia';
import { type RemovableRef, useLocalStorage } from '@vueuse/core/index';
import { uid } from 'uid';
import type { Transaction } from '~/store/transaction';

export interface Project {
  project: string;
}

export interface PersistedProject extends Project {
  id: string;
}

export type ProjectTree = Array<
  PersistedProject & {
    children: Array<PersistedProject>;
  }
>;

interface State {
  projects: RemovableRef<PersistedProject[]>;
}

export function getFullProjectName(
  t: Pick<Transaction, 'category'>,
): string | undefined {
  if (!t.category) return t.category;
  const [, projectName] = t.category.split('/');
  return projectName;
}

class Pro {
  data: PersistedProject;

  constructor(payload: PersistedProject | Project) {
    this.data = {
      ...payload,
      id: 'id' in payload ? payload.id : uid(),
    };
  }

  get id() {
    return this.data.id;
  }

  get json() {
    return this.data;
  }
}

export const useProjectStore = defineStore('project', {
  state: (): State => ({
    projects: useLocalStorage<PersistedProject[]>('project', []),
  }),
  actions: {
    create(project: Project) {
      const pro = new Pro(project);

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
        this.$state.projects.push(pro.json);
      }
    },
    update(id: string, project: Project) {
      const pro = new Pro({ ...project, id });
      const index = this.getIndexById(id);
      if (index !== -1) {
        if (!pro.json.project.includes(':')) {
          const projectBeforeUpdate = this.getById(id);
          if (!projectBeforeUpdate) return;

          this.getSubProjects(projectBeforeUpdate.project).forEach((sub) => {
            this.update(sub.id, {
              project: `${pro.json.project}:${sub.project}`,
            });
          });
        }
        this.$state.projects.splice(index, 1, pro.json);
      } else {
        this.create(pro.json);
      }
    },
    delete(id: string): void {
      const index = this.getIndexById(id);
      if (index !== -1) {
        const project = this.getById(id);
        if (!project) return;

        if (!project.project.includes(':')) {
          const children = this.getSubProjects(project.project);
          children.forEach((p) => this.delete(p.id));
        }

        this.$state.projects.splice(index, 1);
      }
    },
    getNew(): PersistedProject {
      return {
        id: uid(),
        project: '',
      };
    },
    getById(id: string): PersistedProject | undefined {
      return this.$state.projects.find((a) => a.id === id);
    },
    getIndexById(id: string): number {
      return this.$state.projects.findIndex((a) => a.id === id);
    },
    getSubProjects(rootProjectName: string): PersistedProject[] {
      return this.projects
        .filter((p) => p.project.startsWith(rootProjectName + ':'))
        .map((p) => ({
          ...p,
          project: p.project.substring(rootProjectName.length + 1),
        }));
    },
  },
  getters: {
    rootProjects(): PersistedProject[] {
      const sorted = [...this.projects].sort(
        (a: PersistedProject, b: PersistedProject) =>
          a.project.length - b.project.length,
      );

      return sorted.reduce(
        (rootProjects: PersistedProject[], p: PersistedProject) => {
          const colonIndex = p.project.indexOf(':');

          const name = p.project.substring(
            0,
            colonIndex === -1 ? undefined : colonIndex,
          );

          const exists = rootProjects.map((p) => p.project).includes(name);

          return exists
            ? rootProjects
            : rootProjects.concat({ ...p, project: name });
        },
        [],
      );
    },
    tree(): ProjectTree {
      const root = this.rootProjects;

      return root
        .map((r) => {
          const children = this.projects
            .filter((p) => p.project.startsWith(r.project + ':'))
            .map((p) => ({
              ...p,
              project: p.project.substring(r.project.length + 1),
            }))
            .sort((p1, p2) => p1.project.localeCompare(p2.project));

          return {
            ...r,
            children,
          };
        })
        .sort((p1, p2) => p1.project.localeCompare(p2.project));
    },
  },
});
