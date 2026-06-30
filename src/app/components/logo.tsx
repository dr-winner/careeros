import React from "react";
import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon-only" | "mark";
    className?: string;
    theme?: "light" | "dark";
}

const FULL_SIZES = {
    sm: { width: 85, height: 24 },
    md: { width: 113, height: 32 },
    lg: { width: 141, height: 40 },
    xl: { width: 170, height: 48 },
};

const MARK_SIZES = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
};

export default function Logo({
    size = "md",
    variant = "full",
    className = "",
    theme = "dark",
}: LogoProps) {
    const isFull = variant === "full";
    const dimensions = isFull ? FULL_SIZES[size] : MARK_SIZES[size];
    
    let src = "";
    if (isFull) {
        src = theme === "light" ? "/svg/careeros-logo-light.svg" : "/svg/careeros-logo-dark.svg";
    } else {
        // For mark / icon-only, use the beautiful color gradient mark
        src = "/svg/careeros-mark.svg";
    }

    return (
        <div className={`flex items-center flex-shrink-0 ${className}`}>
            <Image
                src={src}
                alt="CareerOS Logo"
                width={dimensions.width}
                height={dimensions.height}
                className="h-auto object-contain flex-shrink-0"
                priority
            />
        </div>
    );
}
