import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Kanban, List, Users, Moon, Sun, User, FileText, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/applications', label: 'Applications', icon: List },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/resumes', label: 'Resumes', icon: FileText },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { dark, toggle } = useTheme();

  return (
    <aside className="w-60 border-r border-sidebar-border glass-sidebar flex flex-col h-full">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Rocket className="h-4.5 w-4.5 text-primary" strokeWidth={2.2} />
            <div className="absolute inset-0 rounded-xl bg-primary/5 glow-primary-sm" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg leading-none tracking-tight">Exodus</span>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1 font-mono tracking-wide uppercase">Job Hunt OS</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary glow-primary-sm" />
                )}
                <link.icon className={cn('h-4.5 w-4.5 transition-transform duration-200', isActive && 'scale-110')} strokeWidth={2} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={toggle}
          aria-pressed={dark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>
    </aside>
  );
}
