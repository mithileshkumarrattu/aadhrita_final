import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { publicClient } from '@/lib/aaht';
import { formatEther } from 'viem';
import { getTokenContract, getWalletInstance } from '@/lib/wallet-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const ownerId = searchParams.get('ownerId');
        const spenderId = searchParams.get('spenderId');

        if (!ownerId || !spenderId) {
            return NextResponse.json({ error: 'ownerId and spenderId are required' }, { status: 400 });
        }

        const ownerWalletDoc = await adminDb.collection('wallets').doc(ownerId).get();
        const spenderWalletDoc = await adminDb.collection('wallets').doc(spenderId).get();

        if (!ownerWalletDoc.exists || !spenderWalletDoc.exists) {
            return NextResponse.json({ error: 'One or both wallets not found' }, { status: 404 });
        }

        const ownerAddr = ownerWalletDoc.data()!.address;
        const spenderAddr = spenderWalletDoc.data()!.address;

        const contract = getTokenContract(); // Read-only contract

        // Use publicClient directly since it's cleaner
        const allowanceWei = await contract.allowance(ownerAddr, spenderAddr);

        return NextResponse.json({
            success: true,
            allowance: formatEther(allowanceWei),
            owner: ownerAddr,
            spender: spenderAddr
        });

    } catch (error: any) {
        console.error('Allowance error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
