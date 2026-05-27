'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContractPieChart } from '@/components/charts/ContractPieChart';
import { schedulesApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { getStatusLabel, getStatusColor, formatTime } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ScheduleStatus } from '@/types';

export default function PartnerSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { user } = useAuthStore();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', 'partner', user?.companyId, year, month],
    queryFn: () =>
      schedulesApi.getAll({ year, month, companyId: user?.companyId ?? undefined }).then((r) => r.data),
    enabled: !!user?.companyId,
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const daySchedules = schedules.filter((s) => s.date === dateStr);

  const contractStats = schedules.reduce<Record<string, { name: string; count: number; done: number }>>(
    (acc, s) => {
      const key = s.contractName || '미분류';
      if (!acc[key]) acc[key] = { name: key, count: 0, done: 0 };
      acc[key].count += 1;
      if (s.status === 'completed') acc[key].done += 1;
      return acc;
    },
    {}
  );

  const pieData = Object.values(contractStats).map((v) => ({
    name: v.name,
    value: v.count ? Math.round((v.done / v.count) * 100) : 0,
  }));

  const tileContent = ({ date }: { date: Date }) => {
    const ds = format(date, 'yyyy-MM-dd');
    const count = schedules.filter((s) => s.date === ds).length;
    return count > 0 ? <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary mx-auto" /> : null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">내 일정</h1>
          <Button asChild>
            <Link href="/partner/booking"><Plus className="mr-2 h-4 w-4" />일정 등록</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-4">
                <Calendar onChange={(v) => setSelectedDate(v as Date)} value={selectedDate}
                  tileContent={tileContent} locale="ko-KR" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>계약별 진행도</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? <ContractPieChart data={pieData} /> : (
                  <p className="text-center text-gray-500 py-4">일정 없음</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{format(selectedDate, 'yyyy년 MM월 dd일')} 타임라인</CardTitle>
            </CardHeader>
            <CardContent>
              {daySchedules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">이 날의 일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map((s) => (
                    <div key={s.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{s.companyName}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(s.startTime)} ~ {formatTime(s.endTime)} / PC {s.pcNumber}
                          </p>
                          {s.contractName && <p className="text-xs text-gray-400">{s.contractName}</p>}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(s.status as ScheduleStatus)}`}>
                          {getStatusLabel(s.status as ScheduleStatus)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
