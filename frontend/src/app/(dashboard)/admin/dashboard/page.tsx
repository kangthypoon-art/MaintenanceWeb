'use client';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompletionBarChart } from '@/components/charts/CompletionBarChart';
import { companiesApi, schedulesApi } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import { Building2, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const year = new Date().getFullYear();

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data),
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', 'all', year],
    queryFn: () => schedulesApi.getAll({ year }).then((r) => r.data),
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySchedules = schedules?.filter((s) => s.date === today) ?? [];
  const completedCount = schedules?.filter((s) => s.status === 'completed').length ?? 0;
  const totalCount = schedules?.length ?? 1;
  const completionRate = Math.round((completedCount / totalCount) * 100);

  const unregisteredCount = companies?.length ?? 0;

  const barData = companies?.map((c) => {
    const companySchedules = schedules?.filter((s) => s.companyId === c.id) ?? [];
    const done = companySchedules.filter((s) => s.status === 'completed').length;
    return {
      companyName: c.name,
      completionRate: companySchedules.length ? Math.round((done / companySchedules.length) * 100) : 0,
    };
  }) ?? [];

  if (companiesLoading || schedulesLoading) return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">대시보드</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-blue-100 p-3"><CheckCircle className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">전체 완료율</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-green-100 p-3"><Calendar className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">오늘 방문</p>
                <p className="text-2xl font-bold">{todaySchedules.length}건</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-yellow-100 p-3"><AlertTriangle className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-500">미예약</p>
                <p className="text-2xl font-bold">{unregisteredCount}개</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-purple-100 p-3"><Building2 className="h-6 w-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">전체 업체</p>
                <p className="text-2xl font-bold">{companies?.length ?? 0}개</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>업체별 완료율</CardTitle></CardHeader>
          <CardContent>
            <CompletionBarChart data={barData} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
