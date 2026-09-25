import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { parseEther } from 'ethers';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

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

        // Get User / Staff Wallet
        let toAddress = null;
        let userDocInfo = null;

        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists && userDoc.data()?.walletAddress) {
            toAddress = userDoc.data()?.walletAddress;
            userDocInfo = userDoc.data();
        } else {
            // Fallback to check staff_credentials
            const staffDocRef = adminDb.collection('staff_credentials').doc(userId);
            const staffDoc = await staffDocRef.get();
            if (staffDoc.exists && staffDoc.data()?.walletAddress) {
                toAddress = staffDoc.data()?.walletAddress;
                userDocInfo = staffDoc.data();
            } else {
                // Another fallback in case it's stored by email/username string in DB instead of exact push ID
                const staffQuery = await adminDb.collection('staff_credentials').where('username', '==', userId).get();
                if (!staffQuery.empty && staffQuery.docs[0].data()?.walletAddress) {
                    toAddress = staffQuery.docs[0].data()?.walletAddress;
                }
            }
        }

        if (!toAddress) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

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
