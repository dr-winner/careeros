import React from "react";
import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon-only" | "mark";
    className?: string;
    theme?: "light" | "dark";
}

const SIZES = {
    sm: { width: 48, height: 48 },
    md: { width: 64, height: 64 },
    lg: { width: 100, height: 100 },
    xl: { width: 140, height: 140 },
};

export default function Logo({
    size = "md",
    variant = "full",
    className = "",
}: LogoProps) {
    const dimensions = SIZES[size];

    const iconComponent = (
        <Image
            src="/cs_logo.png"
            alt="CareerOS Logo"
            width={dimensions.width}
            height={dimensions.height}
            className="flex-shrink-0"
            priority
        />
    );

    if (variant === "icon-only" || variant === "mark") {
        return <div className={className}>{iconComponent}</div>;
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {iconComponent}
            <div>
                <div className="font-bold tracking-tight text-slate-950" style={{ fontSize: `${dimensions.width / 2}px`, lineHeight: 1.1 }}>
                    CareerOS
                </div>
                <div className="font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent" style={{ fontSize: `${dimensions.width / 4}px`, lineHeight: 1 }}>
                    Know Before
                </div>
            </div>
        </div>
    );
}
