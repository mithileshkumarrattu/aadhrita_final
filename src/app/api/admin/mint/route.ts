import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';
import { getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { parseEther } from 'ethers';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

    try {
        const { userId, amount } = await request.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Get User Wallet Address
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || !userDoc.data()?.walletAddress) {
            return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
        }

        const toAddress = userDoc.data()?.walletAddress;

        // 2. Admin Wallet (from ENV)
        const adminWallet = getAdminWallet();
        if (!adminWallet) {
            return NextResponse.json({ error: 'Admin wallet not configured' }, { status: 500 });
        }

        // 3. Connect to Contract as Admin
        const contract = getTokenContract(adminWallet);

        // 4. Distribute Tokens (Actually Transfer from Admin Holdings)
        // If the contract has a 'mintReward' function, use that.
        // User ABI provided in aaht.ts includes 'mintReward'.
        // Let's check if we should use 'transfer' or 'mintReward'.
        // User's prompt mentioned "Admin sends to User".
        // aaht.ts has `mintReward` in ABI. Let's try that first, if it fails fallback to transfer?
        // Let's assume 'mintReward' is the correct function for Admin dispensing.

        console.log(`Minting ${amount} to ${toAddress}`);
        const amountWei = parseEther(amount.toString());

        let tx;
        try {
            // Support both standard ERC20 'mint' and custom 'mintReward'
            if (typeof contract.mintReward === 'function') {
                tx = await contract.mintReward(toAddress, amountWei);
            } else if (typeof contract.mint === 'function') {
                tx = await contract.mint(toAddress, amountWei);
            } else {
                throw new Error("Contract does not have 'mintReward' or 'mint' function");
            }
        } catch (e) {
            console.log("Minting failed, trying transfer...", e);
            tx = await contract.transfer(toAddress, amountWei);
        }

        const receipt = await tx.wait();

        return NextResponse.json({
            success: true,
            txHash: receipt.hash,
            message: `Sent ${amount} AFT to user`
        });

    } catch (error: any) {
        console.error('Mint error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
