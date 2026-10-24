import type { ExpandableListResourceName } from '~/components/expandableList/types';

export function getNameFromExtendableListItem(
  resource: ExpandableListResourceName,
  item:
    | {
        category: string;
      }
    | {
        project: string;
      },
): string {
  switch (resource) {
    case 'project':
      return 'project' in item ? item.project : '';
    case 'category':
      return 'category' in item ? item.category : '';
  }
}
