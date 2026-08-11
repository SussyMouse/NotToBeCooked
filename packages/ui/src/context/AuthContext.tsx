import { api, UserRead } from "@workspace/contracts";
import { useState, useContext, createContext, ReactNode, useEffect, useRef } from "react";

interface AuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    user: UserRead | null
    login: (token: string, user: UserRead) => void
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const accessTokenRef = useRef<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [user, setUser] = useState<UserRead | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        // Dynamic getter allows ApiClient to fetch current in-memory accessToken on every HTTP request
        api.setTokenGetter(() => accessTokenRef.current)
    }, [accessToken])

    useEffect(() => {
        // Register token refresh callback listener
        api.setOnTokenRefreshed((accessToken: string, user: UserRead) => {
            accessTokenRef.current = accessToken
            setAccessToken(accessToken)
            setUser(user)
            setIsLoading(false)
        })

        // Register unauthorized logout callback listener
        api.setOnUnauthorized(() => {
            setAccessToken(null)
            setUser(null)
            setIsLoading(false)
        })

        // On initial app startup (e.g. F5 refresh), attempt silent session restoration via HttpOnly cookie
        async function initAuth() {
            try {
                const response = await api.auth.refresh()
                setAccessToken(response.access_token)
                setUser(response.user)
            } catch {
                setAccessToken(null)
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
    }, [])

    const login = (token: string, user: UserRead) => {
        setAccessToken(token)
        setUser(user)
    }

    const logout = async () => {
        try {
            await api.auth.logout()
        } finally {
            setAccessToken(null)
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
                logout: logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)!