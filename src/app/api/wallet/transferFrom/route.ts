import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWalletInstance, getTokenContract, getAdminWallet, getProvider } from '@/lib/wallet-utils';
import { parseEther, formatEther } from 'ethers';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyStaffRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyStaffRequest(request);
    if (!auth.ok) return auth.response;
    const coordinatorId = auth.uid;

    try {
        const { fromAddress, toAddress, amount } = await request.json();

        if (!fromAddress || !toAddress || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Retrieve Coordinator's Encrypted Key (They are the spender)
        const walletDocRef = adminDb.collection('wallets').doc(coordinatorId);
        const walletDoc = await walletDocRef.get();

        if (!walletDoc.exists) {
            return NextResponse.json({ error: 'Coordinator Wallet not found' }, { status: 404 });
        }

        const { encryptedPrivateKey, address: coordinatorAddress } = walletDoc.data()!;

        // 2. Reconstruct Coordinator Wallet
        let coordinatorWallet;
        try {
            coordinatorWallet = getWalletInstance(encryptedPrivateKey);
        } catch (e: any) {
            return NextResponse.json({ error: `Coordinator Wallet Error: ${e.message}` }, { status: 500 });
        }

        // 3. Connect to Contract
        const contract = getTokenContract(coordinatorWallet);
        const amountWei = parseEther(amount.toString());

        // Check Delegate Allowance
        const allowanceWei = await contract.allowance(fromAddress, coordinatorAddress);
        if (allowanceWei < amountWei) {
            return NextResponse.json({
                error: `Insufficient delegated allowance. Remaining: ${formatEther(allowanceWei)} AFT`
            }, { status: 400 });
        }

        // Check Convener Balance
        const balanceWei = await contract.balanceOf(fromAddress);
        if (balanceWei < amountWei) {
            return NextResponse.json({
                error: `Convener wallet has insufficient funds: ${formatEther(balanceWei)} AFT`
            }, { status: 400 });
        }

        // 4. Auto-Fund Gas if needed for Coordinator
        const ethBalance = await getProvider().getBalance(coordinatorAddress);
        const MIN_GAS_THRESHOLD = parseEther("0.002");

        if (ethBalance < MIN_GAS_THRESHOLD) {
            console.log(`Coordinator ${coordinatorAddress} needs gas for transferFrom.`);
            try {
                const adminWallet = getAdminWallet();
                const fundTx = await adminWallet.sendTransaction({
                    to: coordinatorAddress,
                    value: parseEther("0.005")
                });
                await fundTx.wait();
            } catch (err: any) {
                return NextResponse.json({ error: `Gas Fund Error: ${err.message}` }, { status: 500 });
            }
        }

        // 5. Execute TransferFrom
        const tx = await contract.transferFrom(fromAddress, toAddress, amountWei);
        const receipt = await tx.wait();

        // 6. Log it
        await adminDb.collection('transactions').add({
            from: fromAddress,
            to: toAddress,
            spender: coordinatorAddress,
            amount: amount,
            txHash: receipt.hash,
            userId: coordinatorId, // Log under coordinator action
            status: 'success',
            timestamp: FieldValue.serverTimestamp(),
            type: 'transferFrom'
        });

        return NextResponse.json({
            success: true,
            txHash: receipt.hash,
            message: `Delegated transfer of ${amount} AFT successful`
        });

    } catch (error: any) {
        console.error('TransferFrom error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
