
import confetti from 'canvas-confetti';

// Preload the coin image to avoid flashing
let coinImage: HTMLImageElement | null = null;
if (typeof window !== 'undefined') {
    coinImage = new Image();
    coinImage.src = '/AFT.png';
}

export const triggerFireworks = () => {
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            clearInterval(interval);
            return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
    }, 250);
};

export const triggerCoinBurst = (x: number, y: number) => {
    // Use 'shape: image' to blast AFT coins
    confetti({
        origin: { x, y },
        particleCount: 15, // Fewer heavier particles
        spread: 60,
        startVelocity: 35, // Higher velocity for "clink" feel
        scalar: 2, // Double size
        gravity: 0.8, // Fall faster like metal
        drift: 0,
        shapes: ['image'],
        shapeOptions: {
            image: {
                src: '/AFT.png', // Ensure this path is correct
                width: 64, // Bigger resolution
                height: 64,
            }
        },
        disableForReducedMotion: true
    } as any);

    // Mix in some golden sparkles (standard circles) for "Magic Dust" effect
    confetti({
        origin: { x, y },
        particleCount: 30,
        spread: 100,
        startVelocity: 25,
        scalar: 0.8,
        colors: ['#FFD700', '#FFA500', '#FFFFFF'], // Gold, Orange, White
        shapes: ['circle', 'square'],
        disableForReducedMotion: true
    });
};
