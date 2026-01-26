"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FailedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 to-red-500 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-white">
                    ✕
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Failed</h1>
                <p className="text-gray-500 mb-8">Unfortunately, your payment could not be processed</p>

                <div className="bg-red-50 rounded-lg p-5 mb-8 text-left border-l-4 border-red-500">
                    <p className="text-red-800 font-semibold mb-2">Possible Reasons:</p>
                    <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                        <li>Insufficient balance in UPI account</li>
                        <li>Transaction cancelled by user</li>
                        <li>Network connectivity issues</li>
                        <li>UPI app not responding</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => router.push("/test-payment")}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => router.push("/contact")}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        Support
                    </button>
                </div>

                {orderId && (
                    <p className="text-xs text-gray-400 mt-6">Order ID: {orderId}</p>
                )}
            </div>
        </div>
    );
}

export default function PaymentFailed() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FailedContent />
        </Suspense>
    )
}
