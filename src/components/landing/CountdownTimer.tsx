'use client';

import React, { useState, useEffect } from 'react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            let timeLeft = {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0
            };

            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }

            return timeLeft;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    const TimeBlock = ({ value, label }: { value: number, label: string }) => (
        <div className="flex flex-col items-center mx-1.5 md:mx-4">
            <span className={cn("text-[2.5rem] md:text-6xl font-bold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] leading-none", cinzel.className)}>
                {String(value).padStart(2, '0')}
            </span>
            <span className="text-[9px] md:text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] mt-2">
                {label}
            </span>
        </div>
    );

    const Separator = () => (
        <div className="flex flex-col justify-start h-full pt-1.5 md:pt-4">
            <div className="flex flex-col gap-1.5 md:gap-2 opacity-50">
                <div className="w-1 h-1 md:w-2 md:h-2 bg-neutral-400 rounded-full" />
                <div className="w-1 h-1 md:w-2 md:h-2 bg-neutral-400 rounded-full" />
            </div>
        </div>
    );

    return (
        <div className="flex items-start justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <TimeBlock value={timeLeft.days} label="Days" />
            <Separator />
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <Separator />
            <TimeBlock value={timeLeft.minutes} label="Min" />
            <Separator />
            <TimeBlock value={timeLeft.seconds} label="Sec" />
        </div>
    );
};

export default CountdownTimer;
