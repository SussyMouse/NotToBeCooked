import type { components, paths } from "./schema.js";

// Helper type exports for clean imports in frontend apps
export type UserRead = components["schemas"]["UserRead"];
export type UserCreate = components["schemas"]["UserCreate"];
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];
export type FileRead = components["schemas"]["FileRequest"];

export type { components, paths };
