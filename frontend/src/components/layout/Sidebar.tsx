import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Kanban, List, Users, Briefcase, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/applications', label: 'Applications', icon: List },
  { to: '/contacts', label: 'Contacts', icon: Users },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
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
    <aside className="w-56 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-lg leading-none">Exodus</span>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Job Search Tracker</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground"
          onClick={toggle}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>
    </aside>
  );
}
