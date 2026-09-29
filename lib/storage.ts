export type Note = {
  id: string;
  lessonId?: string;
  quote: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};
export type Activity = {
  id: string;
  type: 'read' | 'complete' | 'note';
  lessonId?: string;
  at: string;
};
export type LearningData = {
  version: 1;
  completed: string[];
  notes: Note[];
  history: Activity[];
  lastLesson?: string;
  quiz: Record<string, number>;
  fontSize: number;
};
export const emptyData: LearningData = {
  version: 1,
  completed: [],
  notes: [],
  history: [],
  quiz: {},
  fontSize: 18,
};
export const STORAGE_KEY = 'lett-learning-v1';
export function isLearningData(value: unknown): value is LearningData {
  if (!value || typeof value !== 'object') return false;
  const d = value as LearningData;
  return (
    d.version === 1 &&
    Array.isArray(d.completed) &&
    d.completed.every((x) => typeof x === 'string') &&
    Array.isArray(d.notes) &&
    d.notes.every(
      (n) =>
        n &&
        typeof n.id === 'string' &&
        typeof n.quote === 'string' &&
        typeof n.text === 'string' &&
        typeof n.createdAt === 'string' &&
        Number.isFinite(Date.parse(n.createdAt)) &&
        typeof n.updatedAt === 'string' &&
        (!n.lessonId || typeof n.lessonId === 'string'),
    ) &&
    Array.isArray(d.history) &&
    d.history.every(
      (h) =>
        h &&
        typeof h.id === 'string' &&
        ['read', 'complete', 'note'].includes(h.type) &&
        typeof h.at === 'string' &&
        Number.isFinite(Date.parse(h.at)) &&
        (!h.lessonId || typeof h.lessonId === 'string'),
    ) &&
    !!d.quiz &&
    typeof d.quiz === 'object' &&
    Object.values(d.quiz).every(
      (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 2,
    ) &&
    [16, 18, 20].includes(d.fontSize) &&
    (!d.lastLesson || typeof d.lastLesson === 'string')
  );
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function streak(history: Activity[]) {
  const days = new Set(history.map((h) => dayKey(new Date(h.at))));
  let count = 0;
  const date = new Date();
  if (!days.has(dayKey(date))) date.setDate(date.getDate() - 1);
  while (days.has(dayKey(date))) {
    count++;
    date.setDate(date.getDate() - 1);
  }
  return count;
}
export function downloadFile(content: string, name: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
