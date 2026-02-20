# Categories & Projects

Categories and projects help you organize and analyze your transactions. Both are stored in the transaction's `category` field using a compact notation.

## Category Format

The `category` field uses special separators:

- `/` separates categories from projects
- `:` separates parent from child

```
Food:Groceries/Home:Kitchen
```

This means: category **Food → Groceries**, project **Home → Kitchen**.

## Categories

Categories represent **what** you spent money on. They support a two-level hierarchy:

- **Root Category** — e.g., `Food`, `Transport`, `Entertainment`
- **Child Category** — e.g., `Food:Groceries`, `Food:Restaurants`

Each category has an assigned **color** that appears as a colored indicator next to transactions.

```ts
export interface PersistedCategory {
    id: string;
    category: string;  // e.g. "Food:Groceries"
    color: string;     // hex color code
}
```

## Projects

Projects represent **why** you spent money — a specific goal, event, or tracking group:

- **Root Project** — e.g., `Home`, `Vacation`
- **Child Project** — e.g., `Home:Kitchen`, `Vacation:Thailand`

```ts
export interface PersistedProject {
    id: string;
    project: string;  // e.g. "Home:Kitchen"
}
```

## Managing Categories & Projects

Navigate to **Preferences** to manage your categories and projects:

- **Categories** — add, rename, and assign colors
- **Projects** — add and rename projects

Categories and projects are created automatically when you type them in a transaction, but managing them in Preferences lets you set colors and clean up unused entries.
