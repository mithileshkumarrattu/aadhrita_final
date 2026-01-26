import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getWalletInstance, getTokenContract, getAdminWallet, provider } from '@/lib/wallet-utils';
import { parseEther, formatEther } from 'ethers';

export async function POST(request: Request) {
    try {
        const { userId, toAddress, amount } = await request.json();

        if (!userId || !toAddress || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Retrieve Encrypted Key
        const walletDocRef = doc(db, 'wallets', userId);
        const walletDoc = await getDoc(walletDocRef);

        if (!walletDoc.exists()) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const { encryptedPrivateKey, address: fromAddress } = walletDoc.data()!;
        if (!encryptedPrivateKey) {
            return NextResponse.json({ error: 'Private key not found' }, { status: 500 });
        }

        // 2. Reconstruct User Wallet
        let userWallet;
        try {
            userWallet = getWalletInstance(encryptedPrivateKey);
        } catch (e: any) {
            console.error("User wallet decryption failed:", e);
            return NextResponse.json({ error: `User Wallet Error: ${e.message}` }, { status: 500 });
        }

        // 3. Connect to Contract & Check Balance
        const contract = getTokenContract(userWallet);
        const balanceWei = await contract.balanceOf(fromAddress);

        // Validate amount
        let amountWei;
        try {
            amountWei = parseEther(amount.toString());
        } catch (e) {
            return NextResponse.json({ error: `Invalid Request: Amount '${amount}' is not valid.` }, { status: 400 });
        }

        if (balanceWei < amountWei) {
            return NextResponse.json({
                error: `Insufficient funds. Balance: ${formatEther(balanceWei)} AFT`
            }, { status: 400 });
        }

        // 4. Auto-Fund Gas (The Magic)
        // Check if user has enough ETH for gas (~0.001 ETH usually enough for transfer)
        const userEthBalance = await provider.getBalance(fromAddress);
        const MIN_GAS_THRESHOLD = parseEther("0.002"); // 0.002 ETH buffer

        if (userEthBalance < MIN_GAS_THRESHOLD) {
            console.log(`User ${fromAddress} low on gas (${formatEther(userEthBalance)} ETH). Funding...`);
            try {
                const adminWallet = getAdminWallet();
                const fundTx = await adminWallet.sendTransaction({
                    to: fromAddress,
                    value: parseEther("0.005") // Send 0.005 ETH to be safe
                });
                await fundTx.wait();
                console.log(`Funded user: ${fundTx.hash}`);
            } catch (fundError: any) {
                console.error("Gas funding failed:", fundError);
                return NextResponse.json({ error: `Admin Gas Fund Error: ${fundError.message}` }, { status: 500 });
            }
        }

        // 5. Execute Transfer (Signed by User)
        // Now user definitely has gas
        const tx = await contract.transfer(toAddress, amountWei);

        // 6. Wait for confirmation
        const receipt = await tx.wait();

        // 7. Log Transaction
        await addDoc(collection(db, 'transactions'), {
            from: fromAddress,
            to: toAddress,
            amount: amount,
            txHash: receipt.hash,
            userId: userId,
            status: 'success',
            timestamp: serverTimestamp(),
            type: 'transfer'
        });

        return NextResponse.json({
            success: true,
            txHash: receipt.hash,
            message: `Sent ${amount} AFT successfully`
        });

    } catch (error: any) {
        console.error('Transfer error:', error);
        return NextResponse.json({ error: error.message || 'Transfer failed' }, { status: 500 });
    }
}
