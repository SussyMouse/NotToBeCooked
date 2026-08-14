/**
 * The auth context object and its hook.
 *
 * Deliberately separate from `AuthContext.tsx`: React Fast Refresh only works
 * on a module whose exports are all components, so exporting `useAuth`
 * alongside `AuthProvider` breaks hot reload for every consumer of the file.
 */

import { createContext, useContext } from "react";
import type { UserRead } from "@workspace/contracts";

export interface AuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    user: UserRead | null
    login: (token: string, user: UserRead) => void
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
    return ctx
}
