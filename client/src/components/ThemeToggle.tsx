import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../store/theme';
import { playChime } from '../lib/soundAndNotification';
import { cn } from './ui';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    playChime('chime');
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer',
        'border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:border-blue-500/50 hover:bg-slate-100 hover:text-blue-600',
        'dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-white/10 dark:hover:text-blue-400',
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 45, scale: 0.7, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 text-blue-600" />
        )}
      </motion.div>
    </button>
  );
}
