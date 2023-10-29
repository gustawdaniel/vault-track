# Categories / Projects

Both projects and categories names are packed in single field of transaction called `category`. There is assumptions
that changes of categories names is rare, but displaying of category name for given transaction is that common operation
that this model should be denormalized.

In this field, there are two special characters

- `/` as separator between categories and projects
- `:` as separator between root and child categories/projects

For example

```
A:B/C:D
```

means that we have root category `A`, child category `B`, root project `C`, and child project `D`.

Independently of this convention, there are also collections of projects and categories with quite similar models

```ts
export interface Category {
    category: string;
}

export interface ColoredCategory extends Category {
    color: string;
}

export interface PersistedCategory extends ColoredCategory {
    id: string;
}
```

and

```ts
export interface Project {
    project: string;
}

export interface PersistedProject extends Project {
    id: string;
}
```

You can see that the only difference is color.
It is because of color box is calculated for transaction using this `category` field in transaction,
so there is no practical usage of color for projects.

