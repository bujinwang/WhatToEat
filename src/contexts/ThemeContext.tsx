import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { getSettings, updateAppSettings } from '../services/settingsService';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;

  // Text colors
  text: string;
  textSecondary: string;
  textDisabled: string;

  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Border and divider
  border: string;
  divider: string;

  // Special
  overlay: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  background: '#f3f4f6',
  surface: '#ffffff',
  card: '#ffffff',

  text: '#1f2937',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',

  primary: '#ef4444',
  primaryLight: '#fca5a5',
  primaryDark: '#dc2626',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  border: '#e5e7eb',
  divider: '#f3f4f6',

  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
};

const darkColors: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  card: '#374151',

  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textDisabled: '#9ca3af',

  primary: '#ef4444',
  primaryLight: '#fca5a5',
  primaryDark: '#dc2626',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  border: '#4b5563',
  divider: '#374151',

  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
};

interface ThemeContextType {
  theme: Theme;
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'auto'>('light');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load theme preference from settings
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const settings = await getSettings();
        setThemeModeState(settings.app.theme);
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Determine actual theme based on mode
  const getActualTheme = (): Theme => {
    if (themeMode === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getActualTheme();
  const isDark = theme.mode === 'dark';

  const setThemeMode = async (mode: 'light' | 'dark' | 'auto') => {
    setThemeModeState(mode);
    try {
      await updateAppSettings({ theme: mode });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
