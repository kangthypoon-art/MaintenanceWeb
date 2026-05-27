import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ScheduleStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | Date, fmt = 'yyyy년 MM월 dd일') {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, fmt, { locale: ko });
}

export function formatTime(timeStr: string) {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
}

export function getStatusLabel(status: ScheduleStatus) {
  const map: Record<ScheduleStatus, string> = {
    pending: '대기',
    confirmed: '확정',
    completed: '완료',
    cancelled: '취소',
  };
  return map[status] || status;
}

export function getStatusColor(status: ScheduleStatus) {
  const map: Record<ScheduleStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

// inspectionCycle은 숫자(일 단위): 30=월별, 90=분기별, 180=반기, 365=연간
export function getCycleLabel(cycle: number): string {
  if (cycle <= 30) return '월별';
  if (cycle <= 90) return '분기별';
  if (cycle <= 180) return '반기별';
  return '연간';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
