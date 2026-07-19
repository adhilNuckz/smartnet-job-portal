import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const redirect = user.role === 'owner' ? '/dashboard/owner' : '/dashboard/translator';
    return <Navigate to={redirect} replace />;
  }
  return children;
}
