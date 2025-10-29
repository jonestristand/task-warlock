'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export type Theme =
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'dracula'
  | 'kanagawa-wave'
  | 'kanagawa-dragon'
  | 'kanagawa-lotus'
  | 'nord'
  | 'nord-light'
  | 'one-dark'
  | 'rose-pine'
  | 'rose-pine-moon'
  | 'rose-pine-dawn'
  | 'tokyo-night'
  | 'everforest';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'catppuccin-mocha',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export default function ThemeProvider({
  children,
  defaultTheme = 'catppuccin-mocha',
  storageKey = 'taskwarlock-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize with stored theme on client, fallback to default
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      return storedTheme || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove(
      'theme-catppuccin-mocha',
      'theme-catppuccin-latte',
      'theme-dracula',
      'theme-kanagawa-wave',
      'theme-kanagawa-dragon',
      'theme-kanagawa-lotus',
      'theme-nord',
      'theme-nord-light',
      'theme-one-dark',
      'theme-rose-pine',
      'theme-rose-pine-moon',
      'theme-rose-pine-dawn',
      'theme-tokyo-night',
      'theme-everforest'
    );

    // Add current theme class
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
