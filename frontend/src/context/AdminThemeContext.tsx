import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useAdminTheme = () => useContext(ThemeCtx);

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('adminTheme') as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-adm-theme', theme);
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
};
