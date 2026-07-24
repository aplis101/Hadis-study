import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HadithGrade } from '@/types/database';
import { SUPABASE_STORAGE_URL, STORAGE_BUCKETS } from '@/lib/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('ar', {
  numeric: 'auto',
});

export function formatDate(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = then - now;

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ];

  for (const [unit, ms] of units) {
    const value = Math.round(diff / ms);
    if (Math.abs(value) >= 1) {
      return relativeTimeFormatter.format(value, unit);
    }
  }

  return relativeTimeFormatter.format(0, 'second');
}

export function buildFileUrl(filePath: string): string {
  return `${SUPABASE_STORAGE_URL}/${STORAGE_BUCKETS.AUDIO}/${filePath}`;
}

const gradeColors: Record<HadithGrade, string> = {
  sahih: 'text-green-700 bg-green-100',
  hasan: 'text-yellow-700 bg-yellow-100',
  daif: 'text-red-700 bg-red-100',
};

export function getGradeColor(grade: HadithGrade): string {
  return gradeColors[grade];
}

export function truncateText(text: string, maxLength: number): string {
  if (maxLength <= 0) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}
