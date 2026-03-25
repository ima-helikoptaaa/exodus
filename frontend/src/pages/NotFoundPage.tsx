import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-muted-foreground">
      <FileQuestion className="h-16 w-16 mb-4 opacity-30" />
      <h1 className="text-2xl font-semibold text-foreground mb-1">Page not found</h1>
      <p className="text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/pipeline')}>Go to Pipeline</Button>
    </div>
  );
}
