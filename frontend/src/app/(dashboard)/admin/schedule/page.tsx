'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { schedulesApi } from '@/lib/api-client';
import { formatTime } from '@/lib/utils';
import { SCHEDULE_STATUSES } from '@/lib/constants';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduleStatus } from '@/types';

export default function AdminSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', year, month],
    queryFn: () => schedulesApi.getAll({ year, month }).then((r) => r.data),
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const daySchedules = schedules.filter((s) => s.date === dateStr);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ScheduleStatus }) =>
      schedulesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('상태가 업데이트되었습니다');
    },
    onError: () => toast.error('업데이트에 실패했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => schedulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('일정이 삭제되었습니다');
    },
    onError: () => toast.error('삭제에 실패했습니다'),
  });

  const tileContent = ({ date }: { date: Date }) => {
    const ds = format(date, 'yyyy-MM-dd');
    const count = schedules.filter((s) => s.date === ds).length;
    return count > 0 ? <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary mx-auto" /> : null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">일정 관리</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <Calendar
                onChange={(v) => setSelectedDate(v as Date)}
                value={selectedDate}
                tileContent={tileContent}
                locale="ko-KR"
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{format(selectedDate, 'yyyy년 MM월 dd일')} 일정</CardTitle>
            </CardHeader>
            <CardContent>
              {daySchedules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">이 날의 일정이 없습니다</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left">업체</th>
                        <th className="pb-2 text-left">엔지니어</th>
                        <th className="pb-2 text-left">시간</th>
                        <th className="pb-2 text-left">PC</th>
                        <th className="pb-2 text-left">상태</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {daySchedules.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2">{s.companyName}</td>
                          <td className="py-2">{s.engineerName}</td>
                          <td className="py-2">{formatTime(s.startTime)} ~ {formatTime(s.endTime)}</td>
                          <td className="py-2">PC {s.pcNumber}</td>
                          <td className="py-2">
                            <select
                              value={s.status}
                              onChange={(e) =>
                                updateMutation.mutate({ id: s.id, status: e.target.value as ScheduleStatus })
                              }
                              className="rounded border px-1 py-0.5 text-xs"
                            >
                              {SCHEDULE_STATUSES.map((st) => (
                                <option key={st.value} value={st.value}>{st.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (confirm('일정을 삭제하시겠습니까?')) deleteMutation.mutate(s.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
