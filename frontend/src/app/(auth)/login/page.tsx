'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(4, '비밀번호를 입력하세요'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      const { user } = res.data;
      const token = res.data.accessToken || res.data.token || '';
      const refreshToken = res.data.refreshToken || '';
      Cookies.set('accessToken', token, { expires: 1 / 24 });
      Cookies.set('refreshToken', refreshToken, { expires: 7 });
      Cookies.set('userRole', user.role, { expires: 7 });
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
      toast.success('로그인 성공');
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/partner/schedule');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">예방점검 관리 시스템</CardTitle>
          <p className="text-center text-sm text-gray-500">로그인하여 계속하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              label="이메일"
              type="email"
              placeholder="admin@test.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              label="비밀번호"
              type="password"
              placeholder="비밀번호"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
