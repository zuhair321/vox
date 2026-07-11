// Mood shift utility — analyzes recent messages and returns a mood value
// that drives the ambient background glow. Nothing invasive, just
// heuristics on caps, punctuation, and emoji density.

export type Mood = 'calm' | 'excited' | 'tense' | 'chaotic';

interface MoodResult {
  mood: Mood;
  intensity: number; // 0-1
  color: string;
  glowSize: string;
}

// Detect mood from a batch of recent messages
export function analyzeMood(messages: Array<{ body?: string }>): MoodResult {
  if (!messages || messages.length === 0) {
    return { mood: 'calm', intensity: 0.1, color: 'rgba(59, 10, 18, 0.04)', glowSize: '60%' };
  }

  const recent = messages.slice(-20); // Last 20 messages
  let capsRatio = 0;
  let exclamationCount = 0;
  let questionCount = 0;
  let emojiCount = 0;
  let totalChars = 0;
  let shortMessages = 0;

  for (const msg of recent) {
    const text = msg.body || '';
    totalChars += text.length;

    // Caps ratio
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 2) {
      capsRatio += (text.replace(/[^A-Z]/g, '').length / letters.length);
    }

    // Punctuation
    exclamationCount += (text.match(/!/g) || []).length;
    questionCount += (text.match(/\?/g) || []).length;

    // Emoji count (simple check for common emoji characters)
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x2600 && code <= 0x27BF) {
        emojiCount++;
      }
    }

    // Short rapid messages suggest excitement
    if (text.length < 10) shortMessages++;
  }

  const avgCaps = capsRatio / Math.max(recent.length, 1);
  const density = (exclamationCount + questionCount + emojiCount) / Math.max(recent.length, 1);

  // Score each mood
  const tensionScore = avgCaps * 0.4 + (exclamationCount > 5 ? 0.3 : 0) + (density > 2 ? 0.3 : 0);
  const excitementScore = (emojiCount > 5 ? 0.3 : 0) + (density > 1.5 ? 0.3 : 0) + (shortMessages > recent.length * 0.4 ? 0.4 : 0);
  const chaosScore = (exclamationCount > 8 ? 0.3 : 0) + (avgCaps > 0.3 ? 0.3 : 0) + (density > 3 ? 0.4 : 0);

  if (chaosScore > 0.5) {
    return { mood: 'chaotic', intensity: Math.min(chaosScore, 1), color: 'rgba(216, 74, 90, 0.08)', glowSize: '80%' };
  }
  if (tensionScore > 0.4) {
    return { mood: 'tense', intensity: Math.min(tensionScore, 1), color: 'rgba(216, 50, 50, 0.06)', glowSize: '70%' };
  }
  if (excitementScore > 0.35) {
    return { mood: 'excited', intensity: Math.min(excitementScore, 1), color: 'rgba(255, 209, 102, 0.05)', glowSize: '65%' };
  }
  return { mood: 'calm', intensity: 0.1, color: 'rgba(59, 10, 18, 0.04)', glowSize: '60%' };
}

// Apply mood to the document root as CSS custom properties
export function applyMoodShift(result: MoodResult) {
  const root = document.documentElement;
  root.style.setProperty('--mood-glow', result.color);
  root.style.setProperty('--mood-intensity', String(result.intensity));
  root.style.setProperty('--mood-size', result.glowSize);
}
