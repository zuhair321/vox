import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  active: boolean;
  color?: string;
  width?: number;
  height?: number;
  bars?: number;
  amplitude?: number; // 0-1 from voice activity detection
}

// Enhanced bar visualizer with gradient colors and smooth animation.
// When `amplitude` is provided (0-1), it drives the bars realistically.
// Otherwise falls back to a smoothed random walk for visual appeal.
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active,
  color,
  width = 120,
  height = 36,
  bars = 16,
  amplitude = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>(new Array(bars).fill(0));
  const targetLevelsRef = useRef<number[]>(new Array(bars).fill(0));
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

    const gap = 2;
    const barWidth = (width - gap * (bars - 1)) / bars;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const levels = levelsRef.current;
      const targets = targetLevelsRef.current;
      const time = Date.now() / 1000;

      for (let i = 0; i < bars; i++) {
        if (active) {
          if (amplitude > 0) {
            // Real amplitude drives the center bars harder
            const centerFactor = 1 - Math.abs(i - bars / 2) / (bars / 2);
            const wave = Math.sin(time * 3 + i * 0.5) * 0.15;
            targets[i] = Math.min(1, amplitude * (0.5 + centerFactor * 0.5) + wave * amplitude);
          } else {
            // Random walk fallback
            if (Math.random() < 0.1) {
              targets[i] = 0.2 + Math.random() * 0.8;
            }
          }
        } else {
          targets[i] = 0.03;
        }
        // Smooth interpolation
        levels[i] += (targets[i] - levels[i]) * 0.25;
        const h = Math.max(2, levels[i] * height * 0.9);
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;

        // Gradient color based on level
        const intensity = levels[i];
        let barColor: string;
        if (color) {
          barColor = color;
        } else if (intensity > 0.7) {
          barColor = '#d84a5a'; // chaos red for loud
        } else if (intensity > 0.4) {
          barColor = '#d9c98d'; // gold for medium
        } else {
          barColor = '#3b0a12'; // void-purple for quiet
        }

        ctx.fillStyle = barColor;
        ctx.beginPath();
        // Rounded bars
        const radius = Math.min(barWidth / 2, 2);
        ctx.roundRect(x, y, barWidth, h, radius);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, color, width, height, bars, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      aria-hidden="true"
    />
  );
};

export default AudioVisualizer;
