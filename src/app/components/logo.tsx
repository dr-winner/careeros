import React from "react";
import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "full" | "icon-only" | "mark";
    className?: string;
    theme?: "light" | "dark";
}

const IMAGE_SIZES = {
    sm: { width: 200, height: 200 },
    md: { width: 250, height: 250 },
    lg: { width: 320, height: 320 },
    xl: { width: 400, height: 400 },
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
        <div className={`flex items-center gap-2 ${className}`}>
            {iconComponent}
            <div>
                <div className="font-bold tracking-tight text-slate-950" style={{ fontSize: textSize, lineHeight: 1.1 }}>
                    CareerOS
                </div>
            </div>
        </div>
    );
}
