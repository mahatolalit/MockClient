import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * Renders `children` when a user session exists, otherwise renders `fallback`.
 * While the session is being validated (initial cookie check), renders a
 * full-screen loader so there is no flash of wrong content.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <>{fallback}</>;
}
