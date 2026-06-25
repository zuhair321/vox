import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  active: boolean;
  color?: string;
  width?: number;
  height?: number;
  bars?: number;
}

// A self-contained bar visualizer that animates pseudo-random audio levels.
// We don't have a real mic stream wired up yet (Phase 5), so we drive the bars
// with a smoothed random walk while `active` is true. Drop-in for a real
// AnalyserNode later: swap the source inside the rAF loop.
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active,
  color,
  width = 120,
  height = 36,
  bars = 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>(new Array(bars).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const barColor = color || getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim() || '#b1121b';
    const gap = 2;
    const barWidth = (width - gap * (bars - 1)) / bars;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const levels = levelsRef.current;
      for (let i = 0; i < bars; i++) {
        if (active) {
          // Random walk toward a new random target each frame.
          const target = 0.2 + Math.random() * 0.8;
          levels[i] += (target - levels[i]) * 0.35;
        } else {
          levels[i] += (0.05 - levels[i]) * 0.2;
        }
        const h = Math.max(2, levels[i] * height);
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, h);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, color, width, height, bars]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      aria-hidden="true"
    />
  );
};

export default AudioVisualizer;
