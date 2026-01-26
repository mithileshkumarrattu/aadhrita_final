import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';
import { getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { parseEther } from 'ethers';

export async function POST(request: Request) {
    try {
        const { userId, amount } = await request.json();

        // Debug Env Var (Don't log the actual key, just existence)
        if (!process.env.ADMIN_PRIVATE_KEY) {
            console.error("CRITICAL: ADMIN_PRIVATE_KEY is missing in process.env");
            return NextResponse.json({ error: "Server Misconfiguration: Admin Key Missing" }, { status: 500 });
        }

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Get User Wallet
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists() || !userDoc.data().walletAddress) {
            return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
        }
        const toAddress = userDoc.data().walletAddress;

        const adminWallet = getAdminWallet();
        const contract = getTokenContract(adminWallet);
        const amountWei = parseEther(amount.toString());

        console.log(`Sending ${amount} AFT to ${toAddress}...`);

        // Send Transaction
        const tx = await contract.transfer(toAddress, amountWei);

        // Wait for 1 confirmation to be sure
        await tx.wait(1);

        return NextResponse.json({
            success: true,
            txHash: tx.hash,
            message: `Sent to ${toAddress}`
        });

    } catch (error: any) {
        console.error('Admin Transfer Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
