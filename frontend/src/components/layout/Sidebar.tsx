'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Building2, FileSpreadsheet,
  Settings, Bell, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const adminMenus = [
  { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/schedule', label: '일정 관리', icon: Calendar },
  { href: '/admin/companies', label: '업체 관리', icon: Building2 },
  { href: '/admin/excel', label: '엑셀 센터', icon: FileSpreadsheet },
  { href: '/admin/settings', label: '시스템 설정', icon: Settings },
];

const partnerMenus = [
  { href: '/partner/schedule', label: '내 일정', icon: Calendar },
  { href: '/partner/booking', label: '일정 등록', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const menus = user?.role === 'admin' ? adminMenus : partnerMenus;

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-white transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen && (
          <span className="text-sm font-bold text-primary truncate">예방점검 관리</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded p-1 hover:bg-gray-100 ml-auto"
          aria-label="사이드바 토글"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {menus.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </Link>
        ))}
        <Link
          href="/notifications"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/notifications')
              ? 'bg-primary text-primary-foreground'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <Bell className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>알림</span>}
        </Link>
      </nav>
    </aside>
  );
}
