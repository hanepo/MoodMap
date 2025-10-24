import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#7B287D',
    secondary: '#7067CF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    cardBackground: '#FFFFFF',
    headerBackground: '#FFFFFF',
    inputBackground: '#F9FAFB',
  }
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#9D4E9F',
    secondary: '#8B85E0',
    background: '#1F2937',
    surface: '#374151',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: '#4B5563',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    cardBackground: '#374151',
    headerBackground: '#374151',
    inputBackground: '#4B5563',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setTheme(darkTheme);
        setIsDark(true);
      } else {
        setTheme(lightTheme);
        setIsDark(false);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = isDark ? lightTheme : darkTheme;
      const newMode = isDark ? 'light' : 'dark';

      setTheme(newTheme);
      setIsDark(!isDark);

      await AsyncStorage.setItem('theme', newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
