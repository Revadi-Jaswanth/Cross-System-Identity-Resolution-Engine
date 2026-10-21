import { useContext } from 'react';
import { ThemeContext } from '@/providers/ThemeProvider';

export const useDarkMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a ThemeProvider');
  }
  return {
    isDark: context.theme === 'dark',
    toggleTheme: context.toggleTheme
  };
};
