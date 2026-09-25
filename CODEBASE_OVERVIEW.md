# Aadhrita Fest App - Codebase Overview

This document serves as a comprehensive guide to the Aadhrita Fest application, detailing its architecture, data flow, and core functionalities for developers and AI agents.

## 🚀 Project Overview
Aadhrita is a festival management application designed for MVGR College. It handles student registrations, event management, digital wallets (AFT tokens), and security/attendance tracking via QR codes.

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database/Auth**: Firebase (Firestore & Firebase Auth)
- **Blockchain Interface**: Ethers.js (Polygon/Amoy Testnet for AFT tokens)
- **Styling**: Tailwind CSS & Lucide Icons
- **UI Components**: Radix UI / Shadcn

---

## 💎 Core Systems

### 1. Wallet & AFT Economy
AFT (Aadhrita Fest Token) is the local digital currency.
- **Contract Migration Ready**: The contract address is managed via the `NEXT_PUBLIC_TOKEN_ADDRESS` environment variable, allowing for seamless contract swaps without code changes.
- **Wallet Lifecycle**: Automatically provisioned for students upon onboarding and for staff upon account creation.
- **Shared Wallets**: Certain roles (like **Convener**) share a single master wallet address to manage funds centrally.
- **APIs**: Located in `src/app/api/wallet/`. Includes `create`, `transfer`, `balance`, and `approve`.
- **Utilities**: `src/lib/wallet-utils.ts` contains ethers.js logic for interacting with the AFT contract.

### 2. Authentication & Authorization
- **Auth Provider**: `src/contexts/AuthContext.tsx` manages Firebase user state and synchronizes it with the `users` Firestore collection.
- **Roles**:
    - `student`: Standard user.
    - `admin`: Full access to staff, wallets, and system config.
    - `faculty` / `coordinator`: Manage specific events.
    - `convener`: High-level oversight and wallet management.
    - `security`: Scanning entry/exit logs.

---

## 📂 Firestore Collections & Schema

| Collection | Description | Key Fields |
| :--- | :--- | :--- |
| `users` | Core user profiles. | `uid`, `email`, `role`, `hasEntryPass`, `hasReceivedWelcomeKit`, `walletAddress` |
| `registrations` | Main event/pass registrations. | `userId`, `eventId`, `paymentStatus`, `amount`, `orderId` |
| `events` | Definitions of all fest events. | `title`, `category`, `entryFeeAft`, `formConfig` (custom fields) |
| `event_registrations` | Specific event participations. | `userId`, `eventId`, `teamId`, `responses` |
| `wallets` | Encrypted private keys (Secure). | `userId`, `address`, `encryptedPrivateKey` |
| `staff_credentials` | Credentials for non-student staff. | `username`, `password`, `role`, `assignedEventId`, `walletAddress` |
| `hackathon_teams` | Hackathon specific registrations. | `teamName`, `leader`, `members`, `paymentStatus` |
| `hackathon_passes` | Generated tokens for hackathon entries. | `token`, `teamId`, `memberName`, `memberRegNo` |
| `access_logs` | Entry/Exit timestamps from scanner. | `userId`, `scanType`, `scannerId`, `timestamp` |

---

## 🌐 Page Functionality

### Public Pages
- `/`: Landing page with hero sections and particle effects.
- `/events`: Listing of all available events with filtering.
- `/about`: Details about the fest.
- `/faces-of-aadhrita`: Showcase of the team behind the fest.

### Student Portal
- `/dashboard`: Main student hub displaying the **Entry Pass Card** (Golden Ticket).
    - **Backside**: Contains QR code for entry and a one-way **Welcome Kit Received** confirmation.
- `/pay`: Portal for making peer-to-peer or event payments using AFT.
- `/register/onboarding`: Initial profile setup flow.
- `/profile`: User personal details and stats.

### Admin & Staff Portal
- `/admin`: High-level stats and configuration.
- `/admin/staff`: Management of security and coordinator credentials.
- `/admin/wallets`: Admin wallet overview, airdrop tools, and coordinator funding.
- `/faculty/event/[id]`: Dashboard for faculty to mark attendance and reward students with extra AFT.
- `/scanner`: Real-time QR scanner for event attendance and welcome kit tracking.
- `/convener`: Approval portal for wallet allowances.

---

## ✨ Recent Major Updates
1.  **Shared Convener Wallets**: Modified `api/wallet/create` to ensure all Convener accounts share the same master wallet address for unified budget management.
2.  **Student Welcome Kit Confirmation**: Added a client-side checkbox on the `EntryPassCard` (backside) allowing students to irreversible mark their kit as received.
3.  **Faculty Portal Rewards**: Implemented a per-user "Extra Reward" system where faculty can award custom AFT amounts after marking attendance.
4.  **Team Visibility Fixes**: Improved registration enrichment logic to correctly handle team name variations (e.g., case sensitivity) for major events like Ideathon.
5.  **AFT Naming Convention**: Standardized all token references to **AFT** globally across UI and logs.

---

## 🛠 Maintenance & Scripts
- **Reconciliation**: API routes in `src/app/api/admin/reconcile-*` handle manual fixes for failed payments or missing passes.
- **Migration**: Temporary scripts in `src/app/api/admin/migrate-*` are used for bulk data updates (e.g., initializing Welcome Kit flags).

---
*Last Updated: March 2026*
