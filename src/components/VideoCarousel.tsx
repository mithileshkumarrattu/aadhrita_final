'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

const TUTORIALS = [
    {
        id: 1,
        title: "How to Create Wallet",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", // Placeholder
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1", // Placeholder
        color: "bg-purple-600"
    },
    {
        id: 2,
        title: "Sending AFT Tokens",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
        color: "bg-orange-600"
    },
    {
        id: 3,
        title: "Scanning QR Codes",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1", // Placeholder
        color: "bg-blue-600"
    }
];

export default function VideoCarousel() {
    const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);

    return (
        <div className="w-full">
            {/* Horizontal Scroll Container */}
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x no-scrollbar">
                {TUTORIALS.map((video) => (
                    <Card
                        key={video.id}
                        className="min-w-[150px] h-[90px] bg-zinc-900 border-2 border-zinc-700/50 rounded-xl overflow-hidden relative group cursor-pointer shadow-sm hover:scale-[1.02] transition-transform snap-center flex-shrink-0"
                        onClick={() => setSelectedVideo(video.videoUrl)}
                    >
                        {/* Thumbnail / Placeholder Overlay */}
                        <div className={`absolute inset-0 opacity-40 ${video.color}`} />

                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-xs font-bold text-white truncate">{video.title}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Fullscreen Video Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-black border-2 border-white/20 rounded-3xl overflow-hidden w-full max-w-4xl aspect-video relative shadow-2xl">
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-white hover:text-black rounded-full p-2 transition-colors border border-white/20"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <iframe
                            src={selectedVideo}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
