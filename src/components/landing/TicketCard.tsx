import { cn } from "@/lib/utils"
// fonts
import { Cinzel } from "next/font/google"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"

const cinzel = Cinzel({ subsets: ["latin"] })

interface TicketCardProps {
    type: "ENTRY" | "HACKATHON"
    price: string
    subtitle: string
    features: string[]
    bgImage: string
    onClick: () => void
    loading?: boolean
    className?: string
}

export default function TicketCard({
    type,
    price,
    subtitle,
    features,
    bgImage,
    onClick,
    loading = false,
    className
}: TicketCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative w-full aspect-[2.2/1] md:aspect-[2.5/1] rounded-3xl overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(212,175,55,0.4)] border border-white/10",
                className
            )}
        >
            {/* Background Image */}
            <Image
                src={bgImage}
                alt={`${type} Ticket`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Dark Overlay for Readability */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            {/* Content Container */}
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span
                            className={cn(
                                "px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest border border-yellow-500/50 text-yellow-500 bg-black/50 backdrop-blur-sm"
                            )}
                        >
                            All Access
                        </span>
                        {type === "HACKATHON" && (
                            <span className="animate-pulse px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                                LIMITED
                            </span>
                        )}
                    </div>
                    <h3
                        className={cn(
                            "text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#FFF8E7] via-[#f7e8b5] to-[#D4AF37] drop-shadow-lg leading-none tracking-tight",
                            cinzel.className
                        )}
                    >
                        {type === "ENTRY" ? "Entry" : "Hackathon"}
                        <span className="block text-2xl md:text-3xl text-white/90">Pass</span>
                    </h3>
                </div>

                {/* Middle Details (Features) */}
                <div className="space-y-1 md:space-y-2 my-2">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                            <span
                                className={cn(
                                    "text-xs md:text-sm text-neutral-200 uppercase tracking-wider font-semibold shadow-black drop-shadow-md"
                                )}
                            >
                                {feature}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer: Price & CTA */}
                <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className={cn("text-xs text-neutral-400 uppercase tracking-widest font-bold")}>
                            Price
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span
                                className={cn(
                                    "text-xl md:text-3xl font-bold text-white drop-shadow-lg"
                                )}
                            >
                                {price}
                            </span>
                            <span className="text-xs text-neutral-400 line-through decoration-red-500/50">
                                {type === "ENTRY" ? "₹400" : "₹800"}
                            </span>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="md:h-12 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold px-4 md:px-6 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all group-hover:translate-x-1"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Pass <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
