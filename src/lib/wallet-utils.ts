import { ethers, Contract, formatEther, parseEther } from 'ethers';
import CryptoJS from 'crypto-js';
import { AAHT_TOKEN_ADDRESS, AAHT_ABI } from './aaht';

// Environment variables should be securely stored
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-this';
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Provider for read operations
export const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Creates a new random wallet and encrypts its private key.
 */
export function createRandomWallet() {
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = CryptoJS.AES.encrypt(wallet.privateKey, ENCRYPTION_KEY).toString();

    return {
        address: wallet.address,
        encryptedPrivateKey: encryptedPrivateKey,
        mnemonic: wallet.mnemonic?.phrase // Optional: decide if we want to save this
    };
}

// Helper to validate private key format
function isValidPrivateKey(key: string): boolean {
    // Check if it matches 0x followed by 64 hex characters
    return /^0x[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Decrypts a private key.
 * @param encryptedKey The encrypted private key string
 */
export function decryptPrivateKey(encryptedKey: string): string {
    const backupKey = 'default-secret-key-change-this';

    // Try Primary Key (New Production Key)
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        // Ensure it looks like a valid private key
        if (decrypted && isValidPrivateKey(decrypted)) return decrypted;
    } catch (e) {
        // Continue to backup
    }

    // Try Backup Key (Old Default Key)
    try {
        if (ENCRYPTION_KEY !== backupKey) { // Avoid double check if keys are same
            const bytes = CryptoJS.AES.decrypt(encryptedKey, backupKey);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (decrypted && isValidPrivateKey(decrypted)) return decrypted;
        }
    } catch (e) {
        // Fall through
    }

    throw new Error("Could not decrypt private key. Data corrupted or wrong key.");
}

/**
 * Gets a Wallet instance connected to the provider from an encrypted key.
 */
export function getWalletInstance(encryptedKey: string) {
    const privateKey = decryptPrivateKey(encryptedKey);
    return new ethers.Wallet(privateKey, provider);
}

/**
 * Validates an Ethereum address.
 */
export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

export function getAdminWallet() {
    if (!ADMIN_PRIVATE_KEY) throw new Error('ADMIN_PRIVATE_KEY is not set in environment variables');
    return new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
}

export function getTokenContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
    return new Contract(AAHT_TOKEN_ADDRESS, AAHT_ABI, signerOrProvider || provider);
}

// Helper to fund a new wallet with some ETH for gas
export async function fundWallet(address: string, amountEth = '0.002') {
    const admin = getAdminWallet();
    const tx = await admin.sendTransaction({
        to: address,
        value: parseEther(amountEth)
    });
    return tx.wait();
}
