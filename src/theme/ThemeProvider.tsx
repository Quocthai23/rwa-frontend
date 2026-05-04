'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createThemeColors, type ThemeColors } from './colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

/**
 * ThemeProvider - Manages theme state and provides colors
 * Automatically detects system dark mode preference
 * Supports light and dark modes with CSS custom properties
 */
export function ThemeProvider({ children, defaultMode = 'light' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Initialize theme lazily to avoid setState inside an effect.
    if (typeof window === 'undefined') return defaultMode;
    const storedMode = localStorage.getItem('theme') as ThemeMode | null;
    return storedMode ?? defaultMode;
  });

  const applyTheme = (newMode: ThemeMode) => {
    const root = document.documentElement;

    if (newMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', newMode);
  };

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  // Get theme colors
  const colors = createThemeColors();

  const value: ThemeContextType = {
    mode,
    colors,
    setMode,
    toggleMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme hook - Access theme colors and mode
 * @example
 * const { colors, mode } = useTheme()
 * const primary = colors.primary500
 * const neutral = colors.neutral200
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
