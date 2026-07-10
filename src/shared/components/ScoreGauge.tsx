import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  /** 0-100 */
  score: number;
  label?: string;
  size?: number;
}

/**
 * Signature visualization for CareerPilot AI.
 *
 * Every score in the product — ATS score, resume-JD match %, interview
 * answer score, presentation readiness — renders through this same
 * semicircular "ascent arc" gauge, styled after an altimeter dial. The
 * waypoint marker at the arc's tip is the one recurring motif that ties
 * the "Pilot" name to the UI without resorting to literal plane icons.
 */
export function ScoreGauge({ score, label, size = 160 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(clamped), 50);
    return () => clearTimeout(t);
  }, [clamped]);

  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - animated / 100);

  const color =
    clamped >= 70 ? "var(--signal)" : clamped >= 40 ? "var(--amber)" : "#E4664F";

  // Waypoint marker position along the semicircle
  const angle = Math.PI - (Math.PI * animated) / 100;
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy - r * Math.sin(angle);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1), stroke 0.3s ease" }}
        />
        <circle cx={markerX} cy={markerY} r={5} fill="white" stroke={color} strokeWidth={3} />
      </svg>
      <div className="-mt-2 flex flex-col items-center">
        <span className="data-figure text-3xl font-semibold" style={{ color }}>
          {Math.round(animated)}
        </span>
        {label && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        )}
      </div>
    </div>
  );
}
