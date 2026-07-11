import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CareerOS — Your AI Career Agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              background: "linear-gradient(90deg, #a78bfa, #06b6d4)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            CareerOS
          </span>
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            margin: "0 0 16px",
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          Your AI Career Agent
        </h1>

        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            textAlign: "center",
            margin: "0 0 48px",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Stop applying blind. Know your fit before you apply.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
          }}
        >
          {[
            { value: "9+", label: "Job sources" },
            { value: "AI", label: "Skills analysis" },
            { value: "Africa", label: "Built for" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{ fontSize: 32, fontWeight: 700, color: "#ffffff" }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: 14, color: "#71717a" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ fontSize: 16, color: "#52525b" }}>careeros.live</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
