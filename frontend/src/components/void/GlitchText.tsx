// VOX logo glitch effect. Renders text with 3 clip-path slice layers that
// fracture every ~10s with chaos/crimson color flicker.
interface GlitchTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlitchText({ text, className = '', style }: GlitchTextProps) {
  return (
    <span
      className={`glitch-text ${className}`}
      data-text={text}
      style={style}
    >
      {text}
    </span>
  );
}
