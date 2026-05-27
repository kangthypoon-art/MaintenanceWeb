'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { excelApi, companiesApi } from '@/lib/api-client';
import { downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

export default function ExcelCenterPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data),
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await excelApi.export({ year, month, companyId });
      downloadBlob(res.data, `점검일정_${year}${month ? `_${month}월` : ''}.xlsx`);
      toast.success('다운로드가 시작되었습니다');
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">엑셀 센터</h1>
        <Card className="max-w-lg">
          <CardHeader><CardTitle>엑셀 다운로드</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">연도</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">월 (선택)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month ?? ''} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">전체</option>
                {months.map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">업체 (선택)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={companyId ?? ''} onChange={(e) => setCompanyId(e.target.value || undefined)}>
                <option value="">전체</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button onClick={handleExport} disabled={loading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {loading ? '다운로드 중...' : '엑셀 다운로드'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
