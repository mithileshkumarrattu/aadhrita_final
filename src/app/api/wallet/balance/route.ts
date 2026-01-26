import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';
import { provider, getTokenContract } from '@/lib/wallet-utils';
import { formatEther } from 'ethers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    try {
        // 1. Get Address
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        const address = userDoc.exists() ? userDoc.data()?.walletAddress : null;

        if (!address) {
            return NextResponse.json({
                exists: false,
                balance: '0',
                gasBalance: '0',
                address: null
            });
        }

        // 2. Fetch Balances
        const contract = getTokenContract(); // Read-only provider
        const tokenBalanceWei = await contract.balanceOf(address);
        const ethBalanceWei = await provider.getBalance(address);

        return NextResponse.json({
            exists: true,
            address: address,
            balance: formatEther(tokenBalanceWei),
            gasBalance: formatEther(ethBalanceWei)
        });

    } catch (error: any) {
        console.error('Balance fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
