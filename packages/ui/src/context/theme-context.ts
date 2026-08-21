import { createContext, useContext } from "react"

export type Theme = "midnight" | "violet" | "teal" | "carbon" | "light" | "system"

export interface ThemeOption {
  id: Theme
  name: string
  description: string
  color: string
  isDark: boolean
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep oceanic blue canvas with vibrant sapphire accents",
    color: "#52A8EA",
    isDark: true,
  },
  {
    id: "violet",
    name: "Amethyst",
    description: "Purple-biased dark canvas with electric violet highlights",
    color: "#A78BFA",
    isDark: true,
  },
  {
    id: "teal",
    name: "Deep Sea",
    description: "Cyan-green slate canvas with bright teal navigation",
    color: "#2DD4BF",
    isDark: true,
  },
  {
    id: "carbon",
    name: "Carbon",
    description: "Neutral slate dark theme focusing visual focus on citations",
    color: "#9FB3C8",
    isDark: true,
  },
  {
    id: "light",
    name: "Daylight",
    description: "Crisp, modern high-contrast daylight theme",
    color: "#1F6FB0",
    isDark: false,
  },
  {
    id: "system",
    name: "System",
    description: "Sync automatically with your operating system preference",
    color: "#8B98A7",
    isDark: true,
  },
]

export interface ThemeContextType {
  theme: Theme
  resolvedTheme: "midnight" | "violet" | "teal" | "carbon" | "light"
  setTheme: (theme: Theme) => void
  themes: ThemeOption[]
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
