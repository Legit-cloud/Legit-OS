import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Loading } from './components/ui';
import Landing from './pages/public/Landing';
import AuthPage from './pages/public/AuthPage';

const AppLayout = lazy(() => import('./pages/app/AppLayout'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Infra = lazy(() => import('./pages/app/Infra'));
const Academy = lazy(() => import('./pages/app/Academy'));
const Classroom = lazy(() => import('./pages/app/Classroom'));
const Events = lazy(() => import('./pages/app/Events'));
const Transit = lazy(() => import('./pages/app/Transit'));
const Finance = lazy(() => import('./pages/app/Finance'));
const Network = lazy(() => import('./pages/app/Network'));
const Notifications = lazy(() => import('./pages/app/Notifications'));
const Profile = lazy(() => import('./pages/app/Profile'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const ActionQueue = lazy(() => import('./pages/admin/ActionQueue'));
const HardwareRentals = lazy(() => import('./pages/admin/HardwareRentals'));
const HubAssets = lazy(() => import('./pages/admin/HubAssets'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const HubRiders = lazy(() => import('./pages/admin/HubRiders'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const UserDirectory = lazy(() => import('./pages/admin/UserDirectory'));
const Partners = lazy(() => import('./pages/admin/Partners'));
const Ledger = lazy(() => import('./pages/admin/Ledger'));
const Comms = lazy(() => import('./pages/admin/Comms'));
const BroadcastCenter = lazy(() => import('./pages/admin/BroadcastCenter'));
const Telemetry = lazy(() => import('./pages/admin/Telemetry'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

function RequireAuth({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token || !user) {
    if (admin) {
      const isRoot = location.pathname === '/admin' || location.pathname === '/admin/';
      const target = isRoot ? '/admin/login' : `/admin/login?next=${encodeURIComponent(location.pathname)}`;
      return <Navigate to={target} replace />;
    }
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (admin && user.role !== 'ADMIN') return <Navigate to="/admin/login?error=unauthorized" replace />;
  if (!admin && user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (!admin && user.status !== 'ACTIVE') return <Navigate to="/register?pending=1" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-sm text-cyan-500">ERROR 404 · SIGNAL LOST</p>
        <h1 className="mt-2 font-display text-4xl font-bold">This page went offline.</h1>
        <Link to="/" className="mt-6 inline-block text-cyan-600 underline">Return to the hub</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading label="Booting L.E.G.I.T OS…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="infra" element={<Infra />} />
          <Route path="academy" element={<Academy />} />
          <Route path="academy/:id" element={<Classroom />} />
          <Route path="events" element={<Events />} />
          <Route path="transit" element={<Transit />} />
          <Route path="finance" element={<Finance />} />
          <Route path="network" element={<Network />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminOverview />} />
          <Route path="queue" element={<ActionQueue />} />
          <Route path="hardware" element={<HardwareRentals />} />
          <Route path="assets" element={<HubAssets />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="riders" element={<HubRiders />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="users" element={<UserDirectory />} />
          <Route path="partners" element={<Partners />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="comms" element={<Comms />} />
          <Route path="broadcast" element={<BroadcastCenter />} />
          <Route path="telemetry" element={<Telemetry />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
