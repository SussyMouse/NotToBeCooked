import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  ThemeContext,
  THEME_OPTIONS,
  type Theme,
  type ThemeContextType,
} from "./theme-context"

const THEME_STORAGE_KEY = "ntbc-theme"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({
  children,
  defaultTheme = "midnight",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
      if (
        stored &&
        ["midnight", "violet", "teal", "carbon", "light", "system"].includes(
          stored
        )
      ) {
        return stored
      }
    }
    return defaultTheme
  })

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return true
  })

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches)
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const resolvedTheme = useMemo((): "midnight" | "violet" | "teal" | "carbon" | "light" => {
    if (theme === "system") {
      return systemIsDark ? "midnight" : "light"
    }
    return theme
  }, [theme, systemIsDark])

  const applyThemeToDOM = useCallback(
    (activeTheme: "midnight" | "violet" | "teal" | "carbon" | "light") => {
      if (typeof document === "undefined") return
      const root = document.documentElement

      if (activeTheme === "light") {
        root.classList.remove("dark")
        root.classList.add("light")
        root.setAttribute("data-theme", "light")
        root.setAttribute("data-pal", "light")
        if (document.body) {
          document.body.classList.remove("dark")
          document.body.classList.add("light")
          document.body.setAttribute("data-theme", "light")
          document.body.setAttribute("data-pal", "light")
        }
      } else {
        root.classList.remove("light")
        root.classList.add("dark")
        root.setAttribute("data-theme", activeTheme)
        root.setAttribute("data-pal", activeTheme)
        if (document.body) {
          document.body.classList.remove("light")
          document.body.classList.add("dark")
          document.body.setAttribute("data-theme", activeTheme)
          document.body.setAttribute("data-pal", activeTheme)
        }
      }
    },
    []
  )

  useEffect(() => {
    applyThemeToDOM(resolvedTheme)
  }, [resolvedTheme, applyThemeToDOM])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    }
  }, [])

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themes: THEME_OPTIONS,
    }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
