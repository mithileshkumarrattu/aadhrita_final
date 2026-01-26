'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Home, CalendarCheck } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function EnrollmentSuccessPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute inset-0 z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-red-100 rounded-full blur-[120px] opacity-40" />
                <div className="absolute top-[40%] right-[0%] w-[40%] h-[40%] bg-yellow-100 rounded-full blur-[100px] opacity-40" />
            </div>

            <div className="relative z-10 max-w-lg w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Visual Icon */}
                <div className="flex justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-red-100 rounded-full scale-150 blur-xl animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-tr from-red-600 to-yellow-500 rounded-2xl rotate-3 shadow-xl flex items-center justify-center text-white relative z-10">
                        <Sparkles className="w-12 h-12" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-600">
                        Enrollment Received!
                    </h1>
                    <p className="text-gray-600 font-medium text-lg leading-relaxed px-4">
                        You have successfully enrolled for the 24-Hour Hackathon.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-2xl mx-auto backdrop-blur-sm">
                        <div className="flex items-start gap-4 text-left">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700 mt-1">
                                <CalendarCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">What Happens Next?</h3>
                                <p className="text-sm text-gray-600">
                                    This is a preliminary enrollment. Our team will screen your application/PPT.
                                    If shortlisted, you will receive an email/call with payment instructions and final confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        className="bg-black text-white hover:bg-gray-900 font-bold rounded-xl h-14 px-8 shadow-xl shadow-gray-200"
                        onClick={() => router.push('/')}
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Back to Home
                    </Button>
                </div>

            </div>
        </div>
    );
}
