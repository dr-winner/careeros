import React from "react";
import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon-only" | "mark";
    className?: string;
    theme?: "light" | "dark";
}

const IMAGE_SIZES = {
    sm: { width: 100, height: 100 },
    md: { width: 125, height: 125 },
    lg: { width: 160, height: 160 },
    xl: { width: 200, height: 200 },
};

const TEXT_SIZES = {
    sm: "14px",
    md: "16px",
    lg: "20px",
    xl: "24px",
};

export default function Logo({
    size = "md",
    variant = "full",
    className = "",
}: LogoProps) {
    const imageDimensions = IMAGE_SIZES[size];
    const textSize = TEXT_SIZES[size];

    const iconComponent = (
        <Image
            src="/cs_logo.png"
            alt="CareerOS Logo"
            width={imageDimensions.width}
            height={imageDimensions.height}
            className="flex-shrink-0"
            priority
        />
    );

    if (variant === "icon-only" || variant === "mark") {
        return <div className={className}>{iconComponent}</div>;
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {iconComponent}
            <div className="flex items-center">
                <div className="font-bold tracking-tight text-slate-950" style={{ fontSize: textSize, lineHeight: 1.1 }}>
                    CareerOS
                </div>
            </div>
        </div>
    );
}
