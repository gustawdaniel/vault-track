# Open Cash Manager

Documentation:

https://docs.opencash.app

Production:

https://opencash.app

Beta:

https://gustawdaniel.github.io/open_cash_manager

## Below there are dev notes, real documentation was linked above:

#### About Sync plans

UI (pinia) -> stream of atomic operations

First operation: account creation for unique id. This operation has assigned uuid by server.

Next, if you want to save, then send prev hash
if it is different then you will get all operations from lash hash that you remember.

then:
a) revert your operations to this hash
b) apply operations from server
c) apply your operations

So any operation should be reversible.

In case of creation, reverse operation is deletion
In case of deletion, reversing operation should contain all deleted object properties to create is again
In case of update we need snapshot before update and after update

All resources have:
a) collection
b) id
c) data (general json)

op: c|u|d (create update delete)
id: uuid|mongoid
c: collection
0: initial state (without id)
1: final state (without id)

---

You should be able to download all by websocket and http to be updated

Backup of data should be available also, so you generally need data and last snapshot id for pure restore.
Last id should be attached to any server response.

Steps:

- create front
- create qif import
- create qif export
- create backend
- create account




---

# Debug mode

Paste in console

```
postMessage({debug: false})
postMessage({debug: true})
```

Next tasks:

- split
    - amount
    - type Expense, Income, Transfer to, Transfer from
    - category
    - project
    - memo

- amountFrom
- amountTo
- exchange rate
- toAccount

Next tasks:
- budgets
- schedules
- search
- reports
- database
- preferences
- exchange rates

Interesting design
https://tailwindui.com/components/application-ui/feedback/empty-states

- [x] stats view over backup
- [x] notification on success / fail
- [x] confirm if remove all data
- [x] disable backup if no data

---

Main page:

- demo
- add account
- description
- wyszukiwanie po transakcjach

https://www.goodfirms.co/expense-management-software/blog/the-top-8-free-and-open-source-expense-management-software

Tax Pal
https://salient.tailwindui.com/

Docs:

- https://github.com/nuxt-themes/docus
- https://docus.dev/api/components
- https://docus.dev/
- https://content.nuxt.com/
- https://nuxt.studio/?utm_source=content-site&utm_medium=section&utm_campaign=home

- Screenshots on landing
- Setup Page
- Guides

Charts:

https://flowbite.com/docs/plugins/charts/

add videos with instructions:

Vidyard
https://secure.vidyard.com/organizations/3506184/library

Next tasks:

- Guide
- Screenshot on landing
- Redesign for full screen
- Import transaction from json files

For publication, we need:

- redesign
- screenshot
- guide

Docs edition:

https://nuxt.studio/@gustawdaniel/open-cash-manager/studio/content?valueId=0.index.md&refId=main


Next task:
- replace tailwind icon by our logo


Major Updates (High Risk / Breaking Changes)
- [x] ESLint: v8 -> v9 (Requires migration to "Flat Config").
- [x] Zod: v3 -> v4.
- [x] Nuxt (apps/docs): v3.20 -> v4.2.2 (To align with apps/ui).
- [x] @nuxtjs/robots: v3 -> v5.
- [x] jsdom: v22 -> v27.
- [x] tsup: v7 -> v8.
- [x] @typescript-eslint: v6 -> v8.


