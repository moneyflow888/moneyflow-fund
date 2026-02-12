// components/mf/MfUi.tsx
"use client";

import React from "react";

export const THEME = {
  bg: "radial-gradient(1200px 800px at 20% 10%, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(900px 600px at 85% 15%, rgba(29,78,216,0.18) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, #07090D 0%, #0A0F1C 50%, #07090D 100%)",
  panel: "rgba(255,255,255,0.04)",
  panel2: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.10)",
  borderGold: "rgba(226,198,128,0.18)",

  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.40)",

  gold: "rgba(212,175,55,0.16)",
  gold2: "rgba(226,198,128,0.95)",

  navy: "rgba(29,78,216,0.14)",

  good: "rgba(34,197,94,0.95)",
  bad: "rgba(239,68,68,0.95)",
};

export const PIE_PALETTE = [
  "rgba(226,198,128,0.95)",
  "rgba(99,102,241,0.90)",
  "rgba(34,197,94,0.90)",
  "rgba(14,165,233,0.90)",
  "rgba(244,63,94,0.90)",
  "rgba(168,85,247,0.90)",
  "rgba(245,158,11,0.90)",
];

export function Shell({
  children,
  headerLeft,
  headerRight,
}: {
  children: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const hasHeader = Boolean(headerLeft || headerRight);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.text,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 18px 60px" }}>
        {hasHeader ? (
          <div className="flex items-start justify-between gap-3">
            <div>{headerLeft}</div>
            {headerRight ? <div className="flex items-center gap-2">{headerRight}</div> : null}
          </div>
        ) : null}

        <div style={{ marginTop: hasHeader ? 18 : 0 }}>{children}</div>
      </div>
    </main>
  );
}

type CardAccent = "gold" | "navy" | "good" | "bad" | "none";

export function Card({
  children,
  title,
  subtitle,
  right,
  accent = "none",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  accent?: CardAccent;
  className?: string;
}) {
  const accentStyle =
    accent === "gold"
      ? { borderColor: "rgba(226,198,128,0.22)", boxShadow: "0 0 40px rgba(212,175,55,0.10)" }
      : accent === "navy"
      ? { borderColor: "rgba(29,78,216,0.22)", boxShadow: "0 0 40px rgba(29,78,216,0.08)" }
      : accent === "good"
      ? { borderColor: "rgba(34,197,94,0.22)", boxShadow: "0 0 40px rgba(34,197,94,0.08)" }
      : accent === "bad"
      ? { borderColor: "rgba(239,68,68,0.22)", boxShadow: "0 0 40px rgba(239,68,68,0.08)" }
      : { borderColor: THEME.border };

  return (
    <section
      className={className}
      style={{
        border: "1px solid",
        ...accentStyle,
        borderRadius: 18,
        background: THEME.panel,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: 18,
      }}
    >
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? (
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>{title}</div>
            ) : null}
            {subtitle ? (
              <div style={{ marginTop: 4, fontSize: 12, color: THEME.muted }}>{subtitle}</div>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      <div style={{ marginTop: title || subtitle || right ? 14 : 0 }}>{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const vColor = tone === "good" ? THEME.good : tone === "bad" ? THEME.bad : THEME.text;

  return (
    <div>
      <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 34,
          fontWeight: 800,
          color: vColor,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ marginTop: 10, fontSize: 12, color: THEME.faint, whiteSpace: "pre-line" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "ghost",
  title,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "gold" | "ghost";
  title?: string;
  type?: "button" | "submit";
}) {
  const style =
    variant === "gold"
      ? {
          background: THEME.gold2,
          color: "#0B0E14",
          border: "1px solid rgba(226,198,128,0.18)",
          boxShadow: "0 0 18px rgba(212,175,55,0.16)",
        }
      : {
          background: "rgba(255,255,255,0.03)",
          color: THEME.text,
          border: `1px solid ${THEME.borderGold}`,
        };

  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity"
      style={{ ...style, opacity: disabled ? 0.65 : 1 }}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "navy" | "good" | "bad";
}) {
  const map: Record<string, { border: string; bg: string; color: string }> = {
    neutral: { border: THEME.border, bg: "rgba(255,255,255,0.05)", color: THEME.muted },
    gold: { border: "rgba(226,198,128,0.30)", bg: "rgba(212,175,55,0.12)", color: THEME.gold2 },
    navy: { border: "rgba(29,78,216,0.30)", bg: "rgba(29,78,216,0.12)", color: "rgba(147,197,253,0.95)" },
    good: { border: "rgba(34,197,94,0.30)", bg: "rgba(34,197,94,0.12)", color: THEME.good },
    bad: { border: "rgba(239,68,68,0.30)", bg: "rgba(239,68,68,0.12)", color: THEME.bad },
  };

  const s = map[tone] ?? map.neutral;

  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold"
      style={{ borderColor: s.border, background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}
