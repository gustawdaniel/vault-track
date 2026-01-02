# VaultTrack

**Open Source Expense Management Application**

[![Vercel](https://deploy-badge.vercel.app/?app=vault-track)](https://vaulttrack.org)

![License](https://img.shields.io/badge/license-MIT-blue.svg)

VaultTrack is a modern, privacy-focused, offline-first personal finance application inspired by tools like YNAB and GNUCash. It helps you track accounts, transactions, and budgets with a seamless multi-device experience.

**[Live Demo](https://vaulttrack.org)** | **[Documentation](https://docs.vaulttrack.org)**

---

## 🚀 Key Features

*   **Offline-First & Real-Time Sync**: 
    *   Works completely offline using `IndexedDB`.
    *   Synchronizes data between devices in near real-time using an Event Sourcing architecture (Long Polling + WebSockets equivalent).
    *   Conflict-free data merging.
*   **Multi-Device**: Seamlessly switch between desktop and mobile.
*   **Privacy Focused**: Your data belongs to you. No third-party tracking.
*   **Comprehensive Tracking**:
    *   Manage multiple accounts (Cash, Bank, Investment, etc.).
    *   Track income, expenses, and transfers.
    *   Multi-currency support with automatic exchange rate handling.
    *   Categories and Projects organization.
*   **Import/Export**:
    *   Full QIF (Quicken Interchange Format) import support.
    *   JSON backup and restore.

## 🛠 Tech Stack

*   **Framework**: [Nuxt 3](https://nuxt.com) (Vue 3)
*   **UI Library**: [Nuxt UI](https://ui.nuxt.com) + [TailwindCSS](https://tailwindcss.com)
*   **State Management**: [Pinia](https://pinia.vuejs.org) + [VueUse](https://vueuse.org)
*   **Database (Client)**: `IndexedDB` (via `idb`)
*   **Sync Engine**: Custom Event Sourcing engine with "Long Polling + Immediate Push".
*   **Testing**: Vitest

## 📦 Getting Started

### Prerequisites

*   Node.js (v24+)
*   pnpm (v9+)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/gustawdaniel/vault-track.git
    cd vault-track
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Start the development server:**
    ```bash
    pnpm dev
    ```
    The app will be available at `http://localhost:3000`.

### Building for Production

```bash
pnpm build
```

## 🏗 Architecture

### Offline Sync Engine

VaultTrack uses a unique **Event Sourcing** approach for synchronization, designed to be robust and conflict-free without requiring complex server-side databases (can run on serverless edge functions):

1.  **Local First**: All actions (creating a transaction, updating an account) are strictly local first. They generate an "Event" (e.g., `TRANSACTION_ADDED`, `ACCOUNT_UPDATED`).
2.  **Event Log**: These events are stored in `IndexedDB`.
3.  **Synchronization**:
    *   **Push**: The client debounces local changes and pushes new events to the server.
    *   **Pull**: The client uses Long Polling to wait for new events from other devices.
    *   **Merge**: Incoming events are merged into the local event log.
    *   **Replay**: The application state (Balances, Lists) is rebuilt by replaying the event log (Reducer pattern).
4.  **Idempotency**: All writes are idempotent, preventing duplicate data issues even with unstable network connections.

### Directory Structure

*   `apps/ui`: Main Nuxt 3 application.
    *   `components`: Vue components.
    *   `pages`: Application routes.
    *   `store`: Pinia stores (Account, Transaction, etc.).
    *   `sync`: Core synchronization logic (`db.ts`, `client.ts`, `manager.ts`, `reducer.ts`).
    *   `server`: Server-side API routes for sync (`/api/sync/*`).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🗺️ Long Term Roadmap

Our development focus is strictly prioritized on the following key pillars:

1.  **Full Feature Parity with CashDroid**
    *   Bring back the complete feature set of the classic 2012 Android application, ensuring robust, proven functionality for personal finance management.
    *   Includes: Recurring transactions, advanced filtering, and specific report types.

2.  **Advanced Visualization & Charts**
    *   Implement comprehensive graphing capabilities to visualize spending trends, category breakdowns, and net worth evolution over time.

3.  **Backend-Synchronized Exchange Rates**
    *   Automatic synchronization of relative currency values via the backend.
    *   Seamless handling of multi-currency portfolios with up-to-date rates.

4.  **Purchasing Power Analysis Layer (Inflation-Awareness)**
    *   A unique analytical layer that allows users to view their finances in **Real Terms** vs **Nominal Terms**.
    *   Analyze spending power relative to external economic metrics (e.g., Average Wage, Inflation/CPI baskets, Big Mac Index) rather than just raw currency numbers.
    *   "How much of the average national wage did I spend on groceries in 2015 vs today?"