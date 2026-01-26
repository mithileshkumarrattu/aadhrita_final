import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createRandomWallet, fundWallet, getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { parseEther } from 'ethers';

export async function POST(request: Request) {
    try {
        const { userId, email } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        // Check if wallet already exists for user
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data()?.walletAddress) {
            return NextResponse.json({
                success: true,
                address: userDoc.data()?.walletAddress,
                message: 'Wallet already exists'
            });
        }

        // Create new wallet
        const wallet = createRandomWallet();

        // Save wallet info
        const batch = writeBatch(db);

        // 1. Secure storage of Private Key
        const walletRef = doc(db, 'wallets', userId);
        batch.set(walletRef, {
            userId: userId,
            address: wallet.address,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
            createdAt: new Date(),
            email: email || 'unknown'
        });

        // 2. Public storage of Address in User Profile
        batch.set(userRef, {
            walletAddress: wallet.address,
            walletCreatedAt: new Date()
        }, { merge: true });

        await batch.commit();

        // 3. Auto-Fund Gas & Welcome Bonus (Genesis Allocation)
        // Check System Settings first
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        const airdropEnabled = configSnap.exists() ? (configSnap.data().airdropEnabled ?? true) : true;

        if (airdropEnabled) {
            try {
                console.log(`Funding Gas for ${wallet.address}...`);
                await fundWallet(wallet.address); // Send ETH for gas

                // Welcome Bonus: 50 AFT
                console.log(`Sending Welcome Bonus (50 AFT) to ${wallet.address}...`);
                const adminWallet = getAdminWallet();
                const contract = getTokenContract(adminWallet);

                const tx = await contract.transfer(wallet.address, parseEther("50"));
                await tx.wait();
                console.log("Welcome Bonus Sent: " + tx.hash);

            } catch (fundErr) {
                console.error("Funding/Bonus failed:", fundErr);
                // We don't fail the request if funding fails, just log it. 
                // User can still be funded manually by Admin later.
            }
        }

        return NextResponse.json({
            success: true,
            address: wallet.address,
            message: airdropEnabled ? 'Wallet created successfully with Welcome Bonus' : 'Wallet created successfully (Airdrop Skipped)'
        });

    } catch (error: any) {
        console.error('Wallet creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
