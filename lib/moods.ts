export const MOODS = [
  { emoji: '😍', label: 'Amazing', score: 5 },
  { emoji: '🥳', label: 'Excited', score: 5 },
  { emoji: '😊', label: 'Happy', score: 4 },
  { emoji: '😑', label: 'Bored', score: 2 },
  { emoji: '😐', label: 'Okay', score: 3 },
  { emoji: '😔', label: 'Sad', score: 1 },
  { emoji: '😢', label: 'Depressed', score: 1 },
  { emoji: '😠', label: 'Angry', score: 1 },
  { emoji: '😤', label: 'Stressed', score: 2 },
  { emoji: '😴', label: 'Tired', score: 2 },
  { emoji: '🤒', label: 'Unwell', score: 2 },
  { emoji: '🔥', label: 'Motivated', score: 5 },
] as const;

export type MoodLabel = (typeof MOODS)[number]['label'];

export const getMoodMeta = (label: string) => {
  return MOODS.find((mood) => mood.label === label) ?? {
    emoji: '🙂',
    label,
    score: 3,
  };
};

export const moodScoreToLabel = (score: number | null) => {
  if (score === null || Number.isNaN(score)) {
    return 'Not enough data';
  }

  if (score < 1.5) return 'Sad';
  if (score < 2.5) return 'Stressed';
  if (score < 3.5) return 'Okay';
  if (score < 4.5) return 'Happy';
  return 'Amazing';
};
