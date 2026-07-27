import type { UserCreate, UserRead, FileRead } from "@workspace/contracts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Creates a new user by sending UserCreate payload to Python FastAPI backend
 * and returns the typed UserRead DTO.
 */
export async function createUser(data: UserCreate): Promise<UserRead> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  const user: UserRead = await response.json();
  return user;
}
