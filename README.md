# Open Cash Manager

**Open Source Expense Management Application**

[![Netlify Status](https://api.netlify.com/api/v1/badges/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6/deploy-status)](https://app.netlify.com/sites/open-cash-manager/deploys)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Open Cash Manager is a modern, privacy-focused, offline-first personal finance application inspired by tools like YNAB and GNUCash. It helps you track accounts, transactions, and budgets with a seamless multi-device experience.

**[Live Demo](https://opencash.app)** | **[Documentation](https://docs.opencash.app)**

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

*   Node.js (v20+)
*   pnpm (v9+)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/gustawdaniel/open_cash_manager.git
    cd open_cash_manager
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

Open Cash Manager uses a unique **Event Sourcing** approach for synchronization, designed to be robust and conflict-free without requiring complex server-side databases (can run on serverless edge functions):

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