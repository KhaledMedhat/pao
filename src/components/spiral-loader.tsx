"use client";

import { useEffect, useRef, useCallback } from "react";

const CONFIG = {
  particleCount: 140,
  trailSpan: 0.28,
  durationMs: 7800,
  pulseDurationMs: 6800,
  strokeWidth: 4.3,
  searchTurns: 4,
  searchBaseRadius: 8,
  searchRadiusAmp: 8.5,
  searchPulse: 2.4,
  searchScale: 1.8,
} as const;

function normalizeProgress(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function getDetailScale(time: number) {
  const pulseProgress = (time % CONFIG.pulseDurationMs) / CONFIG.pulseDurationMs;
  const pulseAngle = pulseProgress * Math.PI * 2;
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

function getPoint(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2;
  const angle = t * CONFIG.searchTurns;
  const radius =
    CONFIG.searchBaseRadius +
    (1 - Math.cos(t)) * (CONFIG.searchRadiusAmp + detailScale * CONFIG.searchPulse);
  return {
    x: 50 + Math.cos(angle) * radius * CONFIG.searchScale,
    y: 50 + Math.sin(angle) * radius * CONFIG.searchScale,
  };
}

function buildPath(detailScale: number, steps = 480) {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const point = getPoint(i / steps, detailScale);
    parts.push(`${i === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  return parts.join(" ");
}

interface SpiralLoaderProps {
  visible: boolean;
  onExited?: () => void;
}

const FADE_DURATION_MS = 500;

export function SpiralLoader({ visible, onExited }: SpiralLoaderProps) {
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const circlesRef = useRef<SVGCircleElement[]>([]);
  const rafRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);

  const setCircleRef = useCallback((el: SVGCircleElement | null, index: number) => {
    if (el) circlesRef.current[index] = el;
  }, []);

  useEffect(() => {
    startedAtRef.current = performance.now();

    function render(now: number) {
      const time = now - startedAtRef.current;
      const progress = (time % CONFIG.durationMs) / CONFIG.durationMs;
      const detailScale = getDetailScale(time);

      if (pathRef.current) {
        pathRef.current.setAttribute("d", buildPath(detailScale));
      }

      circlesRef.current.forEach((node, index) => {
        if (!node) return;
        const tailOffset = index / (CONFIG.particleCount - 1);
        const point = getPoint(
          normalizeProgress(progress - tailOffset * CONFIG.trailSpan),
          detailScale
        );
        const fade = Math.pow(1 - tailOffset, 0.56);
        node.setAttribute("cx", point.x.toFixed(2));
        node.setAttribute("cy", point.y.toFixed(2));
        node.setAttribute("r", (0.9 + fade * 2.7).toFixed(2));
        node.setAttribute("opacity", (0.04 + fade * 0.96).toFixed(3));
      });

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!visible && onExited) {
      const timer = setTimeout(onExited, FADE_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [visible, onExited]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      <div className="w-[min(72vmin,420px)] aspect-square grid place-items-center">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible">
          <g ref={groupRef}>
            <path
              ref={pathRef}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={CONFIG.strokeWidth}
              opacity={0.1}
            />
            {Array.from({ length: CONFIG.particleCount }, (_, i) => (
              <circle
                key={i}
                ref={(el) => setCircleRef(el, i)}
                fill="var(--accent)"
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
