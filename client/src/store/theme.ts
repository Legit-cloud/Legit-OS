import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'legit_hub_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }
}

export const useTheme = create<ThemeState>((set, get) => {
  const initialMode = (typeof window !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'light'
    : 'light');

  const resolved = initialMode === 'system' ? getSystemTheme() : initialMode;
  applyTheme(resolved);

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (get().mode === 'system') {
        const next = e.matches ? 'dark' : 'light';
        applyTheme(next);
        set({ resolvedTheme: next });
      }
    });
  }

  return {
    mode: initialMode,
    resolvedTheme: resolved,
    setMode: (mode: ThemeMode) => {
      const resolved = mode === 'system' ? getSystemTheme() : mode;
      localStorage.setItem(STORAGE_KEY, mode);
      applyTheme(resolved);
      set({ mode, resolvedTheme: resolved });
    },
    toggleTheme: () => {
      const current = get().resolvedTheme;
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      set({ mode: next, resolvedTheme: next });
    },
  };
});
