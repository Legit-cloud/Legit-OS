import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const initial: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: initial,
      toggle: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
    }),
    { name: 'legit-theme' },
  ),
);
