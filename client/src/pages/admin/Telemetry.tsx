import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Clock, Shield, History } from 'lucide-react';
import { Card, Loading, PageHeader, Button } from '../../components/ui';
import { api } from '../../lib/api';

interface Device {
  id: number;
  serial_number: string;
  manufacturer: string;
  model: string;
  hostname: string;
  status: 'Active' | 'UnderRepair' | 'Retired';
  created_at_utc: string;
}

interface ActiveSession {
  user_name: string;
  user_email: string;
  login_time_utc: string;
}

interface WebHistory {
  id: number;
  browser: string;
  domain: string;
  title: string;
  url: string;
  visit_time_utc: string;
}

interface AppHistory {
  id: number;
  app_name: string;
  window_title: string;
  start_time_utc: string;
  end_time_utc: string | null;
}

interface LoginHistory {
  id: number;
  user_name: string;
  user_email: string;
  face_photo_path: string | null;
  login_time_utc: string;
  logout_time_utc: string | null;
}

export default function Telemetry() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: devices, isLoading } = useQuery({
    queryKey: ['admin', 'rental-devices', search],
    queryFn: () => api<Device[]>(`/admin/rental-devices?q=${encodeURIComponent(search)}`),
  });

  const { data: detailData } = useQuery({
    queryKey: ['admin', 'rental-devices', selectedId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return api<{ 
        device: Device; 
        activeSession: ActiveSession | null;
        webHistory: WebHistory[];
        appHistory: AppHistory[];
        loginHistory: LoginHistory[];
      }>(`/admin/rental-devices/${selectedId}?${params.toString()}`);
    },
    enabled: selectedId !== null,
    placeholderData: keepPreviousData,
  });

  const [historyTab, setHistoryTab] = useState<'web' | 'app' | 'logins'>('web');

  if (selectedId && detailData) {
    const { device, activeSession, webHistory, appHistory, loginHistory } = detailData;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedId(null)}>← Back to Devices</Button>
        </div>
        <Card variant="bento" className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {device.hostname}
                </h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-600 dark:text-slate-400 font-mono">
                <span>Serial: <strong className="text-slate-900 dark:text-white">{device.serial_number}</strong></span>
                <span>Model: <strong className="text-slate-900 dark:text-white">{device.manufacturer} {device.model}</strong></span>
                <span>Added: <strong className="text-slate-900 dark:text-white">{new Date(device.created_at_utc).toLocaleDateString()}</strong></span>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${device.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                device.status === 'Retired' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
              {device.status}
            </span>
          </div>
          <div className="mt-8 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Filter Events:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border-slate-200 text-sm dark:bg-slate-900 dark:border-slate-700 p-2" />
            <span className="text-slate-400">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border-slate-200 text-sm dark:bg-slate-900 dark:border-slate-700 p-2" />
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</Button>
            )}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card variant="bento" className="p-6">
            <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-xs flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-cyan-500" /> Current Session
            </h3>
            {activeSession ? (
              <div className="space-y-2">
                <p className="font-medium text-lg">{activeSession.user_name}</p>
                <p className="text-sm text-slate-500">{activeSession.user_email}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <Clock className="h-3 w-3" /> Logged in: {new Date(activeSession.login_time_utc).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-slate-500 italic">No active user session on this device.</p>
            )}
          </Card>
          <Card variant="bento" className="p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-xs flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-500" /> Device History
              </h3>
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
                <button onClick={() => setHistoryTab('web')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${historyTab === 'web' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Web History</button>
                <button onClick={() => setHistoryTab('app')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${historyTab === 'app' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>App Usage</button>
                <button onClick={() => setHistoryTab('logins')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${historyTab === 'logins' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Logins</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {historyTab === 'web' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time (Local)</th>
                      <th className="px-4 py-3 font-medium">Browser</th>
                      <th className="px-4 py-3 font-medium">Domain</th>
                      <th className="px-4 py-3 font-medium">Title / URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {webHistory.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">No web history recorded.</td></tr>}
                    {webHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(h.visit_time_utc).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{h.browser}</td>
                        <td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs dark:bg-slate-800">{h.domain}</span></td>
                        <td className="px-4 py-3">
                          <div className="font-medium mb-1 truncate max-w-xs" title={h.title}>{h.title}</div>
                          <a href={h.url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline text-xs truncate block max-w-xs" title={h.url}>{h.url}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {historyTab === 'app' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Started (Local)</th>
                      <th className="px-4 py-3 font-medium">Ended (Local)</th>
                      <th className="px-4 py-3 font-medium">Application</th>
                      <th className="px-4 py-3 font-medium">Window Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {appHistory.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">No app usage recorded.</td></tr>}
                    {appHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(h.start_time_utc).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500">{h.end_time_utc ? new Date(h.end_time_utc).toLocaleString() : <span className="text-emerald-500 font-medium">Active</span>}</td>
                        <td className="px-4 py-3 font-semibold text-cyan-600">{h.app_name}</td>
                        <td className="px-4 py-3 truncate max-w-xs" title={h.window_title}>{h.window_title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {historyTab === 'logins' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Login Time (Local)</th>
                      <th className="px-4 py-3 font-medium">User Account</th>
                      <th className="px-4 py-3 font-medium">Face Capture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {loginHistory.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">No login sessions recorded.</td></tr>}
                    {loginHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(h.login_time_utc).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <strong className="block text-slate-700 dark:text-slate-300">{h.user_name}</strong>
                          <span className="text-xs text-slate-500">{h.user_email}</span>
                        </td>
                        <td className="px-4 py-3">
                          {h.face_photo_path ? (
                            <img src={h.face_photo_path.startsWith('http') ? h.face_photo_path : `http://localhost:5000/${h.face_photo_path.replace(/\\/g, '/').replace('static/', 'static/')}`} alt="Face capture" className="h-12 w-12 rounded-lg object-cover shadow-sm hover:scale-[3] hover:z-10 transition-transform origin-left cursor-zoom-in" />
                          ) : (
                            <span className="text-xs italic text-slate-400">No Photo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Rental Portal" title="Tracked Devices" subtitle="Monitor and manage all hardware assets." />

      <div className="mb-6 flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Serial or Hostname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field rounded-full pl-10 text-sm"
          />
        </div>
      </div>

      <Card variant="bento" className="overflow-hidden p-0 sm:p-0">
        {isLoading ? (
          <div className="p-12"><Loading /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Serial Number</th>
                  <th className="px-4 py-3 font-medium">Hostname</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {devices?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">No devices found.</td>
                  </tr>
                )}
                {devices?.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">#{dev.id}</td>
                    <td className="px-4 py-3 font-semibold">{dev.serial_number}</td>
                    <td className="px-4 py-3">{dev.hostname}</td>
                    <td className="px-4 py-3 text-slate-500">{dev.manufacturer} {dev.model}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${dev.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          dev.status === 'Retired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}>
                        {dev.status === 'Active' ? <CheckCircle2 className="h-3.5 w-3.5" /> : dev.status === 'Retired' ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {dev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(dev.created_at_utc).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(dev.id)}>
                        Details <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
