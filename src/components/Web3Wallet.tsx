'use client';

import * as React from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AAHT_TOKEN_ADDRESS, AAHT_SYMBOL, AAHT_DECIMALS, getAABalance } from '@/lib/aaht';
import { Loader2, Wallet, Coins } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function Web3Wallet() {
    const { address, isConnected } = useAccount();

    // Custom query to fetch AAHT balance
    const { data: balance, isLoading } = useQuery({
        queryKey: ['aahtBalance', address],
        queryFn: () => getAABalance(address),
        enabled: !!address,
        refetchInterval: 5000 // Poll every 5s
    });

    return (
        <Card className="p-5 bg-yellow-300 border-2 border-black rounded-[1.5rem] shadow-neo relative overflow-hidden mb-6">
            {/* Abstract Pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Coins className="w-24 h-24" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-black rounded-lg text-yellow-300">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Fest Wallet</h2>
                </div>

                <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
                        if (!mounted) {
                            return (
                                <div className="flex items-center gap-2 opacity-50 font-bold">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Wallet...
                                </div>
                            );
                        }

                        if (!isConnected || !address) {
                            return (
                                <div>
                                    <p className="text-sm font-bold mb-3 opacity-80 leading-tight">
                                        Connect your wallet to earn and spend AAHT tokens during the fest!
                                    </p>
                                    <Button
                                        onClick={openConnectModal}
                                        className="w-full bg-black text-white hover:bg-slate-900 border-2 border-black shadow-neo active:shadow-none font-bold rounded-xl"
                                    >
                                        Connect Wallet
                                    </Button>
                                </div>
                            );
                        }

                        if (chain?.unsupported) {
                            return (
                                <Button
                                    variant="destructive"
                                    onClick={openChainModal}
                                    className="w-full border-2 border-black shadow-neo font-bold rounded-xl"
                                >
                                    Wrong Network
                                </Button>
                            );
                        }

                        return (
                            <div className="space-y-4">
                                <div className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border-2 border-black">
                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-60">Your Balance</div>
                                    <div className="text-3xl font-black flex items-baseline gap-1">
                                        {isLoading ? (
                                            <span className="text-2xl animate-pulse">...</span>
                                        ) : (
                                            <span>{balance?.toLocaleString() ?? '0'}</span>
                                        )}
                                        <span className="text-sm font-bold">{AAHT_SYMBOL}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={openAccountModal}
                                        variant="outline"
                                        className="flex-1 bg-white border-2 border-black shadow-sm hover:translate-y-[1px] font-bold text-xs rounded-xl"
                                    >
                                        {account?.displayName}
                                    </Button>
                                    <Button
                                        onClick={() => window.location.href = '/pay'}
                                        className="flex-1 bg-black text-white hover:bg-slate-900 border-2 border-black shadow-sm hover:translate-y-[1px] font-bold text-xs rounded-xl"
                                    >
                                        Pay / Send
                                    </Button>
                                </div>
                            </div>
                        );
                    }}
                </ConnectButton.Custom>
            </div>
        </Card>
    );
}
