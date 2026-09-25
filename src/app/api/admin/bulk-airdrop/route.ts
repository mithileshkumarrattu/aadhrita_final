import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, getDocs } from 'firebase/firestore';
import { getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { parseEther } from 'ethers';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

    try {
        const { amount } = await request.json();

        if (!amount || isNaN(amount)) {
            return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
        }

        const adminWallet = getAdminWallet();
        const contract = getTokenContract(adminWallet);
        const amountWei = parseEther(amount.toString());

        // 1. Get all users
        console.log("Fetching users for airdrop...");
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const targets = snapshot.docs
            .map(doc => doc.data())
            .filter(u => u.walletAddress && u.walletAddress.startsWith('0x'));

        console.log(`Found ${targets.length} targets.`);

        if (targets.length === 0) {
            return NextResponse.json({ message: "No users found" });
        }

        // 2. Manual Nonce Management for Speed
        let currentNonce = await adminWallet.getNonce();
        console.log(`Starting Nonce: ${currentNonce}`);

        const txPromises: Promise<any>[] = [];

        for (const user of targets) {
            console.log(`Queueing ${user.email} (Nonce: ${currentNonce})`);

            // Fire and forget (mostly) - we catch individual errors to not stop the batch
            const p = contract.transfer(user.walletAddress, amountWei, {
                nonce: currentNonce
            }).then((tx) => {
                console.log(`Tx sent to ${user.email}: ${tx.hash}`);
                return { success: true, hash: tx.hash, email: user.email };
            }).catch((err) => {
                console.error(`Failed to send to ${user.email}:`, err);
                return { success: false, error: err.message, email: user.email };
            });

            txPromises.push(p);
            currentNonce++;
        }

        // Wait for all SUBMISSIONS (not confirmations)
        // This is fast.
        const results = await Promise.all(txPromises);

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            summary: {
                total: targets.length,
                succeeded: successCount,
                failed: failureCount
            },
            message: `Batch sent! ${successCount} txs submitted. Check Etherscan for confirmation.`
        });

    } catch (error: any) {
        console.error('Airdrop error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
