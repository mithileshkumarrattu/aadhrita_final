import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db';
import { adminDb } from '@/lib/firebase-admin';
import { createRandomWallet, fundWallet, getAdminWallet, getTokenContract } from '@/lib/wallet-utils';
import { parseEther } from 'ethers';

export async function POST(request: Request) {
    try {
        const { userId, email, role, collectionName = 'users' } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        const targetCollection = collectionName === 'staff' || collectionName === 'staff_credentials'
            ? COLLECTIONS.STAFF
            : collectionName;

        const userRef = adminDb.collection(targetCollection).doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data()?.walletAddress) {
            return NextResponse.json({
                success: true,
                address: userDoc.data()?.walletAddress,
                message: 'Wallet already exists'
            });
        }

        // --- SHARED WALLET LOGIC FOR CONVENERS ---
        if (role === 'convener') {
            const convenersSnap = await adminDb.collection(COLLECTIONS.STAFF)
                .where('role', '==', 'convener')
                .get();

            let existingWallet: any = null;
            for (const doc of convenersSnap.docs) {
                const data = doc.data();
                if (data.walletAddress && doc.id !== userId) {
                    // Found another convener with a wallet!
                    const wDoc = await adminDb.collection('wallets').doc(doc.id).get();
                    if (wDoc.exists) {
                        existingWallet = { ...wDoc.data(), sourceId: doc.id };
                        break;
                    }
                }
            }

            if (existingWallet) {
                console.log(`Sharing Convener Wallet from ${existingWallet.sourceId} to ${userId}`);
                const batch = adminDb.batch();
                // Create a duplicate wallet entry for this user (so Auth/APIs find it by userId)
                batch.set(adminDb.collection('wallets').doc(userId), {
                    ...existingWallet,
                    userId: userId,
                    sharedFrom: existingWallet.sourceId,
                    createdAt: new Date(),
                    email: email || 'unknown'
                });
                // Update User/Staff Doc
                batch.update(userRef, {
                    walletAddress: existingWallet.address,
                    walletCreatedAt: new Date()
                });
                await batch.commit();

                return NextResponse.json({
                    success: true,
                    address: existingWallet.address,
                    message: 'Shared Convener wallet assigned successfully'
                });
            }
        }

        // Create new wallet
        const wallet = createRandomWallet();

        // Save wallet info using Admin Batch
        const batch = adminDb.batch();

        // 1. Secure storage of Private Key
        const walletRef = adminDb.collection('wallets').doc(userId);
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
        const configSnap = await adminDb.collection('system').doc('config').get();
        const airdropEnabled = configSnap.exists ? (configSnap.data()?.airdropEnabled ?? true) : true;

        if (airdropEnabled) {
            try {
                // 1. Fund Gas (Native Token for transactions)
                console.log(`Funding Gas for ${wallet.address}...`);
                await fundWallet(wallet.address); // Send ETH for gas

                // 2. Welcome Bonus: 50 AFT (DISABLED as per user request)
                /*
                console.log(`Sending Welcome Bonus (50 AFT) to ${wallet.address}...`);
                const adminWallet = getAdminWallet();
                const contract = getTokenContract(adminWallet);

                const tx = await contract.transfer(wallet.address, parseEther("50"));
                await tx.wait();
                console.log("Welcome Bonus Sent: " + tx.hash);
                */
            } catch (fundErr) {
                console.error("Funding failed:", fundErr);
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
