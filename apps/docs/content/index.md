---
seo:
  title: VaultTracker - Personal Finance
  description: Track your finances with a private, offline-first, and open-source application. Key features include QIF import, multi-currency support, and encrypted synchronization.
---

::u-page-hero
#title
Track your finances with [VaultTracker]{.text-primary}.

#description
Private, offline-first, and open-source. :br Manage your accounts, transactions, and categories with a modern UI.

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /introduction/architecture
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  to: https://github.com/gustawdaniel/vault-track
  variant: outline
  ---
  Star on GitHub
  :::
::

::u-page-section
  :::u-page-grid
    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2
    target: _blank
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Beautiful visual powered by UI
      class: w-full h-80 object-cover rounded-lg
      dark: /landing/dark/templates-ui-pro.webp
      light: /landing/light/templates-ui-pro.webp
      ---
      :::::

    #title
    Modern & [Beautiful]{.text-primary}

    #description
    Built with **Nuxt 4** and **Nuxt UI**, VaultTracker provides a stunning, responsive interface with built-in dark mode. It's designed to make managing your finances a pleasant experience, not a chore.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    target: _blank
    ---
      :::::div{.bg-elevated.rounded-lg.p-3.overflow-x-auto}
      ```typescript [nuxt.config.ts]
      storage: {
        sync: process.env.REDIS_URL
          ? { driver: 'redis', url: process.env.REDIS_URL }
          : { driver: 'fs', base: '.data/sync' }
      }
      ```
      :::::

    #title
    Private & [Secure]{.text-primary}

    #description
    **Offline-first by design.** Your data lives on your device in IndexedDB and syncs to your personal Redis server only when you choose. You own your data completely.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    target: _blank
    to: /developer-guide/architecture
    ---
      :::::div{.h-full.flex.items-center.justify-center.text-6xl}
      🧑‍💻
      :::::

    #title
    Open & [Extensible]{.text-primary}

    #description
    **100% Open Source.** Import your history via QIF files, extend functionality with the modern TurboRepo codebase, or contribute back to the community.
    ::::
  :::
::
