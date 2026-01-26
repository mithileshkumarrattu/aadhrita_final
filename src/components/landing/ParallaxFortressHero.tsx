'use client';

import { useScroll, useTransform, motion } from 'framer-motion';
import { useRef } from 'react';

export function ParallaxFortressHero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    // Parallax Values
    const skyY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);
    const tombY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const palaceImageY = useTransform(scrollYProgress, [0.2, 1], ["100px", "-50px"]);
    const palaceImageOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);

    return (
        <div ref={ref} className="relative h-[120vh] w-full overflow-hidden bg-[#0B0C10]">
            {/* 1. Sky Gradient */}
            <motion.div
                style={{ y: skyY }}
                className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0B0C10] z-0"
            />

            {/* 2. Hero Text */}
            <motion.div
                style={{ y: titleY }}
                className="relative z-20 h-[60vh] flex flex-col items-center justify-start pt-32 text-center px-4"
            >
                <h1 className="text-6xl md:text-9xl font-black text-white drop-shadow-xl font-sans tracking-tighter">
                    Aadhrita
                </h1>
                <h2 className="text-4xl md:text-6xl text-[#C5A059] font-bold mt-2">
                    2026
                </h2>
            </motion.div>

            {/* 3. Centerpiece: Taj Mahal Style Structure */}
            <motion.div
                style={{ y: tombY }}
                className="absolute top-[35%] left-0 w-full z-10 flex flex-col items-center pointer-events-none opacity-90"
            >
                <div className="relative w-64 h-64 md:w-96 md:h-96">
                    {/* Main Dome */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-40 bg-[#1a1a1a] rounded-t-full border-t-2 border-[#C5A059]">
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-1 h-12 bg-[#C5A059]" />
                    </div>

                    {/* Arches Body */}
                    <div className="absolute top-36 left-1/2 -translate-x-1/2 w-64 h-48 bg-[#151515] rounded-t-lg flex justify-center">
                        <div className="mt-8 w-24 h-32 bg-[#0B0C10] rounded-t-full border-t border-[#C5A059]/30" />
                    </div>

                    {/* Minarets */}
                    <div className="absolute top-20 -left-12 w-8 h-64 bg-[#1a1a1a] rounded-t-lg" />
                    <div className="absolute top-20 -right-12 w-8 h-64 bg-[#1a1a1a] rounded-t-lg" />
                </div>
            </motion.div>

            {/* 4. The Palace Image (Natural Reveal) */}
            <motion.div
                style={{ y: palaceImageY, opacity: palaceImageOpacity }}
                className="absolute bottom-0 inset-x-0 z-30 flex justify-center"
            >
                <img
                    src="/mvgr-palace.png"
                    alt="MVGR Palace"
                    className="w-full h-auto max-h-[50vh] object-cover md:object-contain object-bottom"
                />
                <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#0B0C10] to-transparent" />
            </motion.div>

        </div>
    );
}
