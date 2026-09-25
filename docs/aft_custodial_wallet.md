# AFT Custodial Wallet Architecture

This document outlines the libraries, core concepts, and code components used to construct the AFT (Aadhrita Fest Token) custodial wallet system in the mvgr-student-app.

## 1. Core Architecture & Concepts

The system uses a **Custodial Wallet Auto-Funding (Gasless for User) Pattern**.
1. **Wallet Generation:** When a user registers, the backend generates a random Ethereum wallet. The private key is encrypted symmetrically using AES and stored in Firestore.
2. **Read Operations:** The frontend fetches balances directly from the blockchain via RPC using `viem` (which is fast and lightweight).
3. **Write Operations (Transfers):** When a user initiates a transfer, the Next.js API decrypts their wallet. Since the user's wallet has no raw ETH for gas, the server uses a central `ADMIN_PRIVATE_KEY` wallet to automatically send `0.005 ETH` to the user's wallet. Once the user's wallet receives the gas, it immediately signs and sends the AFT token transfer transaction to the network.

## 2. Libraries Used

*   **`ethers.js` (v6):** The primary heavy-lifter for cryptography. Used for `Wallet.createRandom()`, connecting to the RPC provider, formatting/parsing ether, validating addresses, and executing the actual write transactions (both gas-funding and token-transfers).
*   **`viem`**: Used specifically in `src/lib/aaht.ts` to create a `publicClient` for ultra-fast, read-only contract calls (like checking `balanceOf`).
*   **`crypto-js`**: Used for AES-256 symmetric encryption and decryption of the generated Ethereum private keys (`wallet-utils.ts`).
*   **`firebase-admin`**: Used to securely read encrypted keys from the `wallets` collection and write transaction logs to the `transactions` collection.

## 3. Key Code Components

*   **`src/lib/wallet-utils.ts`**: The cryptographic core. Handles environment variables (`ENCRYPTION_KEY`, `RPC_URL`, `ADMIN_PRIVATE_KEY`), wallet generation, AES encryption/decryption, and the `fundWallet` logic.
*   **`src/lib/aaht.ts`**: The smart contract configuration. Contains the `AAHT_TOKEN_ADDRESS`, the ABI (Application Binary Interface) defining `transfer`, `balanceOf`, and `mintReward`, and the `viem` `publicClient` setup.
*   **`src/app/api/wallet/transfer/route.ts`**: The API endpoint that orchestrates the transfer algorithm (auth check -> decryption -> balance check -> gas funding -> token transfer -> firestore logging).
*   **`src/app/api/wallet/create/route.ts`**: The API endpoint that creates the wallet during user onboarding/faculty creation.

## 4. Environment Variables

*   `ENCRYPTION_KEY`: The AES secret used to encrypt/decrypt user private keys in the database.
*   `ADMIN_PRIVATE_KEY`: The master wallet that holds Sepolia ETH to pay for all user transaction gas fees.
*   `RPC_URL`: The endpoint connecting the backend to the Sepolia testnet (e.g., Alchemy, Infura, or public node).
