
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAdminWallet } from '@/lib/wallet-utils';
import { formatEther } from 'ethers';
import { getProvider } from '@/lib/wallet-utils';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
    // NOTE: GET is intentionally public - it only returns non-sensitive system settings
    // (airdropEnabled, rewardEnabled, admin wallet address). POST is admin-only.
    try {
        // 1. Fetch System Settings
        const configSnap = await adminDb.collection('system').doc('config').get();

        let airdropEnabled = true; // Default to true
        let rewardEnabled = false; // Default to false
        if (configSnap.exists) {
            airdropEnabled = configSnap.data()?.airdropEnabled ?? true;
            rewardEnabled = configSnap.data()?.rewardEnabled ?? false;
        }

        // 2. Fetch Admin Wallet Info
        let gasBalance = '0.0';
        let tokenBalance = '0.0';
        let adminAddress = '';

        try {
            const adminWallet = getAdminWallet();
            adminAddress = adminWallet.address;

            try {
                const balanceWei = await getProvider().getBalance(adminWallet.address);
                gasBalance = formatEther(balanceWei);
            } catch (e) {
                console.error("Failed to fetch ETH balance", e);
            }

            try {
                const { getTokenContract } = await import('@/lib/wallet-utils');
                const contract = getTokenContract(adminWallet);
                const tokenBalanceWei = await contract.balanceOf(adminWallet.address);
                tokenBalance = formatEther(tokenBalanceWei);
            } catch (e) {
                console.error("Failed to fetch AFT balance", e);
            }
        } catch (e) {
            console.error("Admin Wallet Not Configured:", e);
        }

        return NextResponse.json({
            success: true,
            settings: {
                airdropEnabled,
                rewardEnabled
            },
            ...(adminAddress ? {
                adminWallet: {
                    address: adminAddress,
                    gasBalance,
                    tokenBalance
                }
            } : {})
        });

    } catch (error: any) {
        console.error("System Config Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();

        // Merge the incoming settings with existing ones
        const updateData: any = {
            updatedAt: new Date()
        };

        if (typeof body.airdropEnabled !== 'undefined') updateData.airdropEnabled = body.airdropEnabled;
        if (typeof body.rewardEnabled !== 'undefined') updateData.rewardEnabled = body.rewardEnabled;

        // Save to Firestore
        await adminDb.collection('system').doc('config').set(updateData, { merge: true });

        return NextResponse.json({
            success: true,
            settings: updateData
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
