import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>({ theme: "light", setTheme: () => undefined, toggle: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("idea-validator-theme") as Theme | null;
    const next = stored === "dark" || stored === "light" ? stored : "light";
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem("idea-validator-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
