
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAdminWallet } from '@/lib/wallet-utils';
import { formatEther } from 'ethers';
import { provider } from '@/lib/wallet-utils';

export async function GET() {
    try {
        // 1. Fetch System Settings
        const configRef = doc(db, 'system', 'config');
        const configSnap = await getDoc(configRef);

        let airdropEnabled = true; // Default to true
        if (configSnap.exists()) {
            airdropEnabled = configSnap.data().airdropEnabled ?? true;
        }

        // 2. Fetch Admin Wallet Info
        const adminWallet = getAdminWallet();
        // provider is already imported

        // Fetch Balance
        // We use the provider directly for native ETH (or MATIC/POL) balance for Gas
        // For Token Balance (AFT), we'd need the contract. Let's return both if possible, or just Gas for now as requested.
        // Actually user asked "are really tokens going from admin wallet". We should show Token Balance too.

        const balanceWei = await provider.getBalance(adminWallet.address);
        const gasBalance = formatEther(balanceWei);

        // Fetch Token Balance (AFT)
        // We need the contract instance. 
        // Importing getTokenContract might cause circular deps if not careful? No, it's fine.
        const { getTokenContract } = await import('@/lib/wallet-utils');
        const contract = getTokenContract(adminWallet);
        const tokenBalanceWei = await contract.balanceOf(adminWallet.address);
        const tokenBalance = formatEther(tokenBalanceWei);

        return NextResponse.json({
            success: true,
            settings: {
                airdropEnabled
            },
            adminWallet: {
                address: adminWallet.address,
                gasBalance,
                tokenBalance
            }
        });

    } catch (error: any) {
        console.error("System Config Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { airdropEnabled } = await request.json();

        // Save to Firestore
        await setDoc(doc(db, 'system', 'config'), {
            airdropEnabled,
            updatedAt: new Date()
        }, { merge: true });

        return NextResponse.json({
            success: true,
            airdropEnabled
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
