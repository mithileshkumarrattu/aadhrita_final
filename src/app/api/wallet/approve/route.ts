import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWalletInstance, getTokenContract, getAdminWallet, getProvider } from '@/lib/wallet-utils';
import { parseEther, formatEther } from 'ethers';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyStaffRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyStaffRequest(request);
    if (!auth.ok) return auth.response;
    const convenerId = auth.uid;

    try {
        const { spenderAddress, amount } = await request.json();

        if (!spenderAddress || amount === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Retrieve Convener's Encrypted Key
        const walletDocRef = adminDb.collection('wallets').doc(convenerId);
        const walletDoc = await walletDocRef.get();

        if (!walletDoc.exists) {
            return NextResponse.json({ error: 'Convener Wallet not found' }, { status: 404 });
        }

        const { encryptedPrivateKey, address: convenerAddress } = walletDoc.data()!;

        // 2. Reconstruct Convener Wallet
        let convenerWallet;
        try {
            convenerWallet = getWalletInstance(encryptedPrivateKey);
        } catch (e: any) {
            return NextResponse.json({ error: `Convener Wallet Error: ${e.message}` }, { status: 500 });
        }

        // 3. Connect to Contract
        const contract = getTokenContract(convenerWallet);
        const amountWei = parseEther(amount.toString());

        // 4. Auto-Fund Gas if needed
        const ethBalance = await getProvider().getBalance(convenerAddress);
        const MIN_GAS_THRESHOLD = parseEther("0.002");

        if (ethBalance < MIN_GAS_THRESHOLD) {
            console.log(`Convener ${convenerAddress} needs gas for approve.`);
            try {
                const adminWallet = getAdminWallet();
                const fundTx = await adminWallet.sendTransaction({
                    to: convenerAddress,
                    value: parseEther("0.005")
                });
                await fundTx.wait();
            } catch (err: any) {
                return NextResponse.json({ error: `Gas Fund Error: ${err.message}` }, { status: 500 });
            }
        }

        // 5. Execute Approve
        const tx = await contract.approve(spenderAddress, amountWei);
        const receipt = await tx.wait();

        // 6. Log it
        await adminDb.collection('transactions').add({
            from: convenerAddress,
            to: spenderAddress,
            amount: amount,
            txHash: receipt.hash,
            userId: convenerId,
            status: 'success',
            timestamp: FieldValue.serverTimestamp(),
            type: 'approve'
        });

        return NextResponse.json({
            success: true,
            txHash: receipt.hash,
            message: `Approved ${amount} AFT for spender`
        });

    } catch (error: any) {
        console.error('Approve error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
