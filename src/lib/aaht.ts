import { createPublicClient, http, Address } from 'viem';
import { sepolia } from 'viem/chains';

// Token Details
export const AAHT_TOKEN_ADDRESS = '0xc66936ccd191CB849aD73e839e6486b8088a3072';
export const AAHT_SYMBOL = 'AFT';
export const AAHT_DECIMALS = 18;

// Standard ERC20 ABI + Custom 'mintReward'
export const AAHT_ABI = [
    // Read-only
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function",
        "stateMutability": "view"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function",
        "stateMutability": "view"
    },
    // Write (Standard Transfer)
    {
        "constant": false,
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function",
        "stateMutability": "nonpayable"
    },
    // Write (Admin Mint)
    {
        "constant": false,
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "mintReward",
        "outputs": [],
        "type": "function",
        "stateMutability": "nonpayable"
    }
] as const;

// Read-only Client
export const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
});

export async function getAABalance(address: Address | undefined) {
    if (!address) return 0;
    try {
        const balance = await publicClient.readContract({
            address: AAHT_TOKEN_ADDRESS,
            abi: AAHT_ABI,
            functionName: 'balanceOf',
            args: [address],
        }) as bigint;
        // Convert BigInt to number
        return Number(balance) / (10 ** AAHT_DECIMALS);
    } catch (e) {
        console.error("Failed to fetch balance", e);
        return 0;
    }
}
