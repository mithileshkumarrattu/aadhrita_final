import PaymentForm from "@/components/paytm/PaymentForm";

export default function TestPaymentPage() {
    return (
        <div className="min-h-screen bg-black bg-[url('/img/stars-bg.png')] bg-cover bg-center py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <div className="w-full max-w-2xl relative z-10">
                <div className="text-center mb-10">
                    <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-2 font-poppins">
                        Gateway Verification
                    </h3>
                    <p className="text-gray-400 text-sm tracking-widest uppercase">
                        Secure Environment • Staging Mode
                    </p>
                </div>

                <PaymentForm />
            </div>
        </div>
    );
}
