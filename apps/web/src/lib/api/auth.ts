import type { LoginRequest, RegisterRequest, TokenResponse, ApiError } from "@workspace/contracts";

const API_BASE = "http://localhost:8000";

/**
 * Log in user and return JWT Token & User profile
 */
export async function loginUser(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorBody: ApiError = await response.json();
    throw new Error(errorBody.message || "Login failed");
  }

  return response.json();
}

/**
 * Register a new user account
 */
export async function registerUser(data: RegisterRequest): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody: ApiError = await response.json();
    throw new Error(errorBody.message || "Registration failed");
  }

  return response.json();
}
