import type { ScheduleStatus } from '@/types';

// inspectionCycle: 일 단위 정수값
export const INSPECTION_CYCLES: { value: number; label: string }[] = [
  { value: 30, label: '월별 (30일)' },
  { value: 90, label: '분기별 (90일)' },
  { value: 180, label: '반기별 (180일)' },
  { value: 365, label: '연간 (365일)' },
];

export const SCHEDULE_STATUSES: { value: ScheduleStatus; label: string }[] = [
  { value: 'pending', label: '대기' },
  { value: 'confirmed', label: '확정' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

export const PC_NUMBERS = [1, 2, 3, 4, 5];
export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 18;
