# MVGR Student Portal - Project Overview

## 1. Introduction & Core Concept
The **MVGR Student Portal** is a comprehensive campus companion app designed to digitize the student experience. 

### Key Philosophies
-   **Neo-Brutalist Design**: A bold, high-contrast aesthetic (Black/White/Yellow) that feels modern and engaging.
-   **Gamified Economy**: Built around the **Aadritha Fest Token (AFT)**, a custom digital currency.
-   **Gas-less Experience**: Students never pay transaction fees. The system uses a "Relayer" pattern where the Admin Wallet pays for all gas (ETH) fees automatically.
-   **Mobile-First**: Designed primarily for mobile usage but responsive for desktop.

---

## 2. Technical Architecture
### Frontend
-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS + Shadcn UI
-   **State Management**: React Context (`AuthContext`)

### Backend & Database
-   **Firebase Auth**: Handles user identity (Email/Password, Google).
-   **Firebase Firestore**: NoSQL database for User Profiles, Event Logs, Chat Messages, and Notes.

### Blockchain Layer
-   **Network**: Ethereum Sepolia Testnet
-   **Wallet Model**: Custodial Wallets.
    -   Keys are generated client-side/server-side, encrypted with AES (`crypto-js`), and stored in Firestore.
    -   Users authorize transactions via their app password; the app decrypts the key momentarily to sign.
-   **Tokens**: ERC-20 Standard (AFT).

---

## 3. Detailed Page Breakdown

### 🏠 Public Pages

#### 1. Landing Page (`/`)
-   **Purpose**: The marketing face of the app.
-   **Features**:
    -   **Hero Section**: Bold typographic intro.
    -   **Feature Grid**: Explains "Earn, Spend, Win" economy.
    -   **Navigation**: Quick access to Login/Register.
-   **Design**: Recently simplified to a clean Neo-Brutalist demo style.

#### 2. Authentication (`/login`, `/signup`)
-   **Purpose**: Secure entry points.
-   **Features**:
    -   **Registration No. Logic**: Validates format.
    -   **Google Auth**: One-tap sign-in.
    -   **Auto-Redirect**: Sends users to `/dashboard` if already logged in.

---

### 🛡️ Student Dashboard (`/dashboard`)
The central hub for all student activities.

#### 1. Wallet Card
-   **Live Balance**: Shows real-time AFT balance.
-   **Address**: Displays truncated wallet address.
-   **Actions**: Quick buttons for `Transfer` (Pay) and `Receive` (QR).

#### 2. Feature Grid 
-   **Schedule (`/schedule`)**: 
    -   Interactive Calendar for Fest Events.
    -   Clicking a date opens a Dialog with event details (Time, Location, Description).
-   **Notes (`/notes`)**:
    -   **Repository**: A searchable library of lecture notes.
    -   **Google Drive Viewer**: Integrated PDF previewer for seamless reading.
    -   **Organization**: Grouped by Subject/Category.
-   **Chat (`/chat`)**:
    -   **Class Groups**: specific chat rooms based on Semester/Section.
    -   **Role-Based**: Only Class Representatives (CRs) can *post* messages; Students can *view* (Announcement channel style).
-   **Notifications (`/notifications`)**:
    -   Real-time feed of campus announcements and alerts.

#### 3. Payments (`/pay`)
-   **Purpose**: Sending AFT to others or buying items.
-   **Features**:
    -   **Search**: Find users by Registration Number.
    -   **QR Scanner**: (Planned) Scan to pay at stalls.
    -   **Gas-less Logic**: 
        -   Before sending, the API checks if the user has ETH. 
        -   If `ETH < 0.002`, the Admin Wallet *auto-funds* the user with 0.005 ETH to pay for the gas.
        -   This ensures 100% reliability for students.

#### 4. Clubs (`/clubs`)
-   **Purpose**: Directory of student clubs.
-   **Features**: Lists active clubs and their registration status.

#### 5. Profile (`/profile`)
-   **Purpose**: Account management.
-   **Features**:
    -   **Digital ID Card**: Shows Name, Branch, Reg No.
    -   **Logout**: Securely ends the session.

---

## 4. Admin Portal (`/admin/*`)
*Restricted access via `role: 'admin'` check.*

#### 1. Admin Dashboard (`/admin`)
-   **Overview**: Key metrics (Total Users, Transactions, Event Status).

#### 2. Wallet Manager (`/admin/wallets`)
-   **Purpose**: The "Bank" of the fest.
-   **Features**:
    -   **User Table**: View all users, roles, and wallet addresses.
    -   **Live Balances**: See exactly how much AFT/ETH each student holds.
    -   **Bulk Operations**:
        -   **Bulk Airdrop**: Select multiple students -> Send AFT. (Processes sequentially for safety).
        -   **Delete/Promote**: Manage user roles.

#### 3. Calendar Manager (`/admin/calendar`)
-   **Purpose**: CMS for the Schedule page.
-   **Features**: Add/Edit/Delete global events (e.g., "Hackathon - Day 1").

#### 4. Event Logs (`/admin/logs`)
-   **Purpose**: Audit trail.
-   **Features**: View all blockchain transactions and system actions logged in Firestore.

---

## 5. Critical Under-the-Hood Workflows

### 🪄 Auto-Onboarding (The "Magic" Flow)
1.  User signs up at `/signup`.
2.  App calls `/api/wallet/create`.
3.  **Backend Action**:
    -   Generates a random Ethereum Wallet.
    -   Encrypts Private Key -> Stores in Firestore (`wallets` collection).
    -   **Auto-Fund 1**: Admin Wallet sends **0.002 ETH** (Gas).
    -   **Auto-Fund 2**: Admin Wallet transfers **50 AFT** (Welcome Bonus).
4.  User lands on Dashboard ready to spend.

### 💸 Transaction Flow
1.  Student clicks "Pay".
2.  App calls `/api/wallet/transfer`.
3.  **Backend Action**:
    -   Decrypts student's private key.
    -   Checks ETH balance.
    -   If low, **pauses** -> requests ETH from Admin -> waits for confirmation.
    -   Once funded, signs and transmits the Token Transfer.
4.  Transaction completes successfully on-chain.

---

## 6. Security Overview
-   **AuthGuard**: A Higher-Order Component that wraps the app. checks `useAuth()`. If prompt is unauthenticated and path is not public (`/login`, `/signup`), it forces a redirect to `/`.
-   **Env Variables**: 
    -   Private Keys (`ADMIN_PRIVATE_KEY`) are never exposed to the client.
    -   Encryption Keys (`ENCRYPTION_KEY`) for wallet storage.

---

## 7. Known Limitations / Future Roadmap
-   **Chat**: Currently one-way (CR -> Student). Could be expanded to full group chat.
-   **QR**: UI exists but camera integration needs a library like `react-qr-reader`.
-   **Notes Upload**: Currently only Admins can upload via the UI.
