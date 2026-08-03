import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "../context/AuthContext"


const ProtectedLayout = () => {
    const { isAuthenticated, isLoading } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (!isAuthenticated) {
        // why state={{ from: location }} replace
        return <Navigate to="/login" state={{ from: location }} replace />
    }
    return <Outlet />
}

export default ProtectedLayout