import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-muted-foreground">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Compass className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Page not found</h1>
      <p className="text-sm mb-6 text-muted-foreground/60">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/pipeline')}>Go to Pipeline</Button>
    </div>
  );
}
