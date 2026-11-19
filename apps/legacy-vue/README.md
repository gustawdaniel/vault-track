# legacy-vue — reference only

The previous Nuxt 4 version of VaultTrack. **It is not developed, installed, built or tested.**

- It is excluded from the pnpm workspace (`!apps/legacy-vue` in `pnpm-workspace.yaml`), so `pnpm install` does not install its dependencies. `package.json` stays only as a record of what it used.
- Keep it as source code to read — mainly for LLMs — when fixing or porting features in the current app, `apps/svelte`. New work goes there, never here.
- The Tauri desktop/Android shell moved to `apps/svelte/src-tauri`.

---

```js
module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['xo', 'plugin:vue/vue3-essential'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      extends: ['xo-typescript'],
      files: ['*.ts', '*.tsx'],
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['vue'],
  rules: {},
};
```
