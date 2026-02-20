---
seo:
  title: VaultTracker - Personal Finance
  description: Track your finances with a private, offline-first, and open-source application. Key features include QIF import, multi-currency support, and encrypted synchronization.
---

::u-page-hero
#title
AI-Powered Finances with [VaultTracker]{.text-primary}.

#description
Private, offline-first, and smart. :br Scan receipts, automate transactions, and own your data.

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
    class: col-span-2 lg:col-span-1
    to: /introduction/architecture
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Modern UI with dark mode support
      class: w-full h-80 object-cover rounded-lg
      dark: /images/vault_tracker_modern_ui.png
      light: /images/vault_tracker_modern_ui.png
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
    to: /introduction/transaction#receipt-scanning
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: AI-powered receipt scanning
      class: w-full h-80 object-cover rounded-lg
      dark: /images/receipt.png
      light: /images/receipt.png
      ---
      :::::

    #title
    Smart [Automation]{.text-primary}

    #description
    **Scan receipts** and let AI extract details automatically. Smart categorization and split transactions save you time on every purchase.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    to: /introduction/reports
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Financial reports and charts
      class: w-full h-80 object-cover rounded-lg
      dark: /images/reports.png
      light: /images/reports.png
      ---
      :::::

    #title
    Reports & [Analytics]{.text-primary}

    #description
    **Cash flow forecasts**, monthly analysis, and category breakdowns — all with real-time multi-currency conversion. Understand where your money goes.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    to: /introduction/assertions
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Balance assertions and reconciliation
      class: w-full h-80 object-cover rounded-lg
      dark: /images/assertions.png
      light: /images/assertions.png
      ---
      :::::

    #title
    Balance [Assertions]{.text-primary}

    #description
    Set verification checkpoints against your bank statements. The **Reconciliation Widget** automatically detects discrepancies and helps you fix them in one click.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    to: /files/backup-sync
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Private and secure data with encryption
      class: w-full h-80 object-cover rounded-lg
      dark: /images/privacy_security.png
      light: /images/privacy_security.png
      ---
      :::::

    #title
    Private & [Secure]{.text-primary}

    #description
    **Offline-first by design.** Your data lives on your device in IndexedDB and syncs to your personal server only when you choose. You own your data completely.
    ::::

    ::::u-page-card
    ---
    spotlight: true
    class: col-span-2 lg:col-span-1
    to: /developer-guide/architecture
    ---
      :::::u-color-mode-image
      ---
      height: 320
      alt: Open source code and extensibility
      class: w-full h-80 object-cover rounded-lg
      dark: /images/vault_tracker_open_source.png
      light: /images/vault_tracker_open_source.png
      ---
      :::::

    #title
    Open & [Extensible]{.text-primary}

    #description
    **100% Open Source.** Import your history via QIF files, extend functionality with the modern TurboRepo codebase, or contribute back to the community.
    ::::
  :::
::
