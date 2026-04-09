import React from "react";
import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon-only" | "mark";
    className?: string;
    theme?: "light" | "dark";
}

const IMAGE_SIZES = {
    sm: { width: 40, height: 40 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 80, height: 80 },
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
        <div className={`flex items-center gap-0 ${className}`}>
            {iconComponent}
            <span className="font-bold tracking-tight text-slate-950" style={{ fontSize: textSize, lineHeight: 1 }}>
                CareerOS
            </span>
        </div>
    );
}
