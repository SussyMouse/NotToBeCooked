import type { components, paths } from "./schema.js";

export { schemas } from "./zod.js";
export { ApiClient, api } from "./api_client.js";

// Helper type exports for clean imports in frontend apps
export type UserRead = components["schemas"]["UserRead"];

export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type ApiError = components["schemas"]["ApiError"];
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];

export type { components, paths };
