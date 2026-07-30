import type {
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
    ApiError,
} from "./index.js"

export interface ApiClientConfig {
    baseUrl?: string
    getToken?: () => string | null
    onUnauthorized?: () => void
}

export class ApiClient {
    private baseUrl: string
    private getToken: () => string | null
    private onUnauthorized?: () => void

    constructor(config: ApiClientConfig = {}) {
        this.baseUrl = config.baseUrl || this.resolveBaseUrl()
        this.getToken =
            config.getToken ||
            (() =>
                typeof window !== "undefined"
                    ? localStorage.getItem("auth_token")
                    : null)
        this.onUnauthorized = config.onUnauthorized
    }

    private resolveBaseUrl(): string {
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
            return import.meta.env?.VITE_API_URL || "http://localhost:8000"
        }
        return import.meta.env?.VITE_API_URL || "http://localhost:8000"
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken()

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...((options.headers as Record<string, string>) || {}),
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        })

        if (response.status === 401 && this.onUnauthorized) {
            this.onUnauthorized()
        }

        if (!response.ok) {
            let errorData: ApiError
            try {
                errorData = await response.json()
            } catch {
                errorData = { code: "UNKNOWN_ERROR", message: response.statusText }
            }
            throw errorData
        }

        return response.json()
    }

    // Auth Endpoints
    public auth = {
        login: (credentials: LoginRequest): Promise<TokenResponse> => {
            return this.request<TokenResponse>("/auth/login", {
                method: "POST",
                body: JSON.stringify(credentials),
            })
        },

        register: (data: RegisterRequest): Promise<TokenResponse> => {
            return this.request<TokenResponse>("/auth/register", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },

        getMe: (): Promise<UserRead> => {
            return this.request<UserRead>("/auth/me")
        },
    }
}

export const api = new ApiClient()
