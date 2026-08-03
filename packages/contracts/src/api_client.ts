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
    onTokenRefreshed?: (newToken: string, user: UserRead) => void
}

type RefreshSubscribers = (newToken: string) => void;

export class ApiClient {
    private baseUrl: string
    private getToken: () => string | null
    private onUnauthorized?: () => void
    private onTokenRefreshed?: (newToken: string, user: UserRead) => void

    // Race-condition control variables
    private isRefreshing: boolean = false;
    private refreshSubscribers: RefreshSubscribers[] = [];

    constructor(config: ApiClientConfig = {}) {
        this.baseUrl = config.baseUrl || this.resolveBaseUrl()
        this.getToken =
            config.getToken ||
            (() =>
                typeof window !== "undefined"
                    ? localStorage.getItem("auth_token")
                    : null)
        this.onUnauthorized = config.onUnauthorized
        this.onTokenRefreshed = config.onTokenRefreshed
    }

    public setTokenGetter(fn: () => string | null) {
        this.getToken = fn
    }

    public setOnUnauthorized(fn: () => void) {
        this.onUnauthorized = fn
    }

    public setOnTokenRefreshed(fn: (newToken: string, user: UserRead) => void) {
        this.onTokenRefreshed = fn
    }

    private subscribeRefresh(cb: RefreshSubscribers) {
        this.refreshSubscribers.push(cb)
    }

    private onRefreshSubscribers(newToken: string) {
        this.refreshSubscribers.forEach((cb) => cb(newToken))
        this.refreshSubscribers = []
    }

    private resolveBaseUrl(): string {
        const env = (
            import.meta as ImportMeta & {
                env?: { VITE_API_URL?: string }
            }
        ).env

        return env?.VITE_API_URL || "http://localhost:8000"
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
            credentials: "include",
            headers,
        })

        if (response.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
            if (!this.isRefreshing) {
                this.isRefreshing = true

                try {
                    const refreshResult = await this.auth.refresh()
                    this.isRefreshing = false
                    this.onTokenRefreshed?.(refreshResult.access_token, refreshResult.user)
                    this.onRefreshSubscribers(refreshResult.access_token)
                    return this.request<T>(endpoint, options)
                } catch (refreshErr: any) {
                    this.isRefreshing = false
                    this.refreshSubscribers = []
                    this.onUnauthorized?.()
                    throw refreshErr
                }

            }

            return new Promise<T>((resolve, reject) => {
                this.subscribeRefresh(() => {
                    this.request<T>(endpoint, options)
                        .then(resolve)
                        .catch(reject)
                })
            })
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

        refresh: (): Promise<TokenResponse> => {
            return this.request<TokenResponse>("/auth/refresh", {
                method: "POST"
            })
        },

        logout: (): Promise<{ status: string }> => {
            return this.request<{ status: string }>("/auth/logout", {
                method: "POST"
            })
        }
    }
}

export const api = new ApiClient()
