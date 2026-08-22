import { api, type UserRead } from "@workspace/contracts"
import { useState, type ReactNode, useEffect, useRef } from "react"
import { AuthContext } from "./auth-context"

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const accessTokenRef = useRef<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserRead | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Declared before the effects that call it: as a `const` it is in the
  // temporal dead zone until this line runs, and an effect is only safe
  // because it fires after render. Keeping it above removes the trap.
  const applyAccessToken = (token: string | null) => {
    setAccessToken(token)
    accessTokenRef.current = token
  }

  useEffect(() => {
    // Dynamic getter allows ApiClient to fetch current in-memory accessToken on every HTTP request
    api.setTokenGetter(() => accessTokenRef.current)
  }, [accessToken])

  useEffect(() => {
    // Register token refresh callback listener
    api.setOnTokenRefreshed((accessToken: string, user: UserRead) => {
      applyAccessToken(accessToken)
      setUser(user)
      setIsLoading(false)
    })

    // Register unauthorized logout callback listener
    api.setOnUnauthorized(() => {
      applyAccessToken(null)
      setUser(null)
      setIsLoading(false)
    })

    // On initial app startup (e.g. F5 refresh), attempt silent session restoration via HttpOnly cookie
    async function initAuth() {
      try {
        const response = await api.auth.refresh()
        applyAccessToken(response.access_token)
        setUser(response.user)
      } catch {
        applyAccessToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = (token: string, user: UserRead) => {
    applyAccessToken(token)
    setUser(user)
  }

  const logout = async () => {
    try {
      await api.auth.logout()
    } finally {
      applyAccessToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading: isLoading,
        isAuthenticated: !!accessToken && !!user,
        user: user,
        login: login,
        logout: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
