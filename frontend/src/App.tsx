import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import PipelinePage from '@/pages/PipelinePage';
import ApplicationsPage from '@/pages/ApplicationsPage';
import ApplicationDetailPage from '@/pages/ApplicationDetailPage';
import ContactsPage from '@/pages/ContactsPage';
import NotFoundPage from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/pipeline" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
