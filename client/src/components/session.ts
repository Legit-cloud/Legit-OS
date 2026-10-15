import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { closeSocket, getSocket, useSocketEvent } from '../lib/socket';
import type { Notification, User } from '../lib/types';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';

import { handleIncomingAlert } from '../lib/soundAndNotification';

/**
 * Keeps the signed-in session fresh: refreshes the profile, opens the socket,
 * and reacts to server pushes (notifications, forced logout, profile changes).
 */
export function useSessionSync() {
  const qc = useQueryClient();
  const setUser = useAuth((s) => s.setUser);
  const logout = useLogout();

  const me = useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User }>('/auth/me') });
  useEffect(() => {
    if (me.data) setUser(me.data.user);
  }, [me.data, setUser]);

  useEffect(() => {
    getSocket();
  }, []);

  useSocketEvent<Notification>('notification', (n) => {
    handleIncomingAlert(n.title, n.body);
    toast.info(n.title, n.body);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  });
  useSocketEvent('profile:changed', () => {
    for (const key of ['me', 'finance', 'courses', 'bookings', 'lounge']) qc.invalidateQueries({ queryKey: [key] });
  });
  useSocketEvent('bookings:changed', () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['lounge'] });
  });
  useSocketEvent('force-logout', () => {
    toast.error('Session ended', 'Your account access was changed by an administrator.');
    void logout(false);
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const clear = useAuth((s) => s.clear);
  return async (notifyServer = true) => {
    if (notifyServer) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    closeSocket();
    clear();
    qc.clear();
    navigate('/');
  };
}
