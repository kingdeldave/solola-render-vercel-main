// Contexte de thème simple : mode clair/sombre et couleur principale.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const DEFAULT_COLOR = '#2563eb';

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('solola_dark_mode') === 'true');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('solola_accent_color') || DEFAULT_COLOR);

  useEffect(() => {
    localStorage.setItem('solola_dark_mode', String(darkMode));
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('solola_accent_color', accentColor);
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  const value = useMemo(
    () => ({ darkMode, setDarkMode, accentColor, setAccentColor }),
    [darkMode, accentColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme doit être utilisé dans ThemeProvider.');
  }
  return value;
}
