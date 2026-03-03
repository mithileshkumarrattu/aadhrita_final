"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, CreditCard, Sparkles } from "lucide-react";

export default function PaymentForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        studentName: "",
        email: "",
        phone: "",
        passType: "standard",
        customAmount: "",
    });

    const passPrices: any = {
        standard: 499,
        vip: 799,
        group: 1999,
        custom: 0,
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!formData.studentName || !formData.email || !formData.phone) {
                throw new Error("Please fill all fields");
            }
            if (!formData.email.includes("@")) throw new Error("Invalid email");
            if (formData.phone.length !== 10) throw new Error("Phone number must be 10 digits");

            let finalAmount = passPrices[formData.passType];
            if (formData.passType === "custom") {
                finalAmount = parseFloat(formData.customAmount);
                if (isNaN(finalAmount) || finalAmount <= 0) {
                    throw new Error("Please enter a valid amount");
                }
            }

            // Step 1: Generate unique Order ID (Shortened for Paytm Reliability < 30 chars)
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const orderId = `PASS_${Date.now()}_${uniqueSuffix}`; // ~23 chars

            // Step 2: Initiate (V1 Flow)
            const response = await fetch("/api/paytm/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId,
                    studentName: formData.studentName,
                    email: formData.email,
                    phone: formData.phone,
                    amount: finalAmount,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Payment initiation failed");
            }

            const data = await response.json();

            // --- DEBUG LOGGING ---
            console.log("PAYTM RESPONSE DATA:", data);
            // ---------------------

            if (!data.success) {
                setError(data.message || "Payment service is temporarily down. Please try again later.");
                setLoading(false);
                return;
            }

            if (!data.txnToken) {
                throw new Error("Failed to generate Transaction Token");
            }

            // Verify Critical Data
            if (!data.mid || !data.orderId) {
                console.error("CRITICAL: Missing MID or OrderID", data);
                throw new Error("Payment configuration missing. Check console.");
            }

            // Step 3: Redirect to Paytm using txnToken (V1 Flow)
            // Staging: securegw-stage.paytm.in, Prod: secure.paytmpayments.com
            // Dynamic Environment Check
            const isStaging = process.env.NODE_ENV !== "production"; // Default to prod in build
            const baseUrl = isStaging ? "https://securegw-stage.paytm.in" : "https://securegw.paytm.in";

            const form = document.createElement("form");
            form.method = "POST";
            form.action = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${data.orderId}`;

            const tokenInput = document.createElement("input");
            tokenInput.type = "hidden";
            tokenInput.name = "txnToken";
            tokenInput.value = data.txnToken;
            form.appendChild(tokenInput);

            document.body.appendChild(form);
            form.submit();
        } catch (err: any) {
            console.error("Payment Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

            <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Aadhrita Entry Pass
                    </h2>
                    <p className="text-sm text-gray-400 mt-2">Unlock the Kingdom of Experience</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pass Type</label>
                        <div className="relative">
                            <select
                                name="passType"
                                value={formData.passType}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                            >
                                <option value="standard" className="bg-gray-900 text-amber-400">Standard Pass - ₹499</option>
                                <option value="vip" className="bg-gray-900 text-purple-400">VIP Pass - ₹799</option>
                                <option value="group" className="bg-gray-900 text-blue-400">Group Pass - ₹1,999</option>
                                <option value="custom" className="bg-gray-900 text-green-400">Custom Amount (Test)</option>
                            </select>
                            <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>

                        {formData.passType === 'custom' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2"
                            >
                                <input
                                    type="number"
                                    name="customAmount"
                                    value={formData.customAmount}
                                    onChange={handleChange}
                                    placeholder="Enter Amount (INR)"
                                    className="w-full bg-white/5 border border-green-500/50 rounded-lg p-3 text-green-400 placeholder-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                                />
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Name</label>
                        <input
                            type="text"
                            name="studentName"
                            value={formData.studentName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Phone"
                                maxLength={10}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Total Amount</span>
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-200">
                            ₹{formData.passType === 'custom' ? (formData.customAmount || '0') : passPrices[formData.passType]}
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Confirm & Pay <CreditCard className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-green-400/80 mt-4">
                        <ShieldCheck className="w-4 h-4" />
                        <span>100% Secure Payment via Paytm UPI</span>
                    </div>
                </form>
            </div>
        </div>
    );
}
