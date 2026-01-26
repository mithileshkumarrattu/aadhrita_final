'use client';

import { useEffect, useState } from 'react';

// Generates random particles
const generateParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));
};

export function GoldenDustOverlay() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Only generate on client to avoid hydration mismatch
    setParticles(generateParticles(20)); // Reduced count for performance
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-[#C5A059] rounded-full opacity-40"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            bottom: '-10px',
            animation: `floatUp ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
             opacity: 0.6;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 20 - 10}px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
