import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";




const UserCreate = z.object({ email: z.string().email(), password: z.string().min(8) }).passthrough();
const UserRead = z.object({ id: z.string().uuid(), email: z.string().email(), created_at: z.string().datetime({ offset: true }) }).passthrough();
const ValidationError = z.object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string(), input: z.unknown().optional(), ctx: z.object({}).partial().passthrough().optional() }).passthrough();
const HTTPValidationError = z.object({ detail: z.array(ValidationError) }).partial().passthrough();
const LoginRequest = z.object({ email: z.string().email(), password: z.string().min(8) }).passthrough();
const TokenResponse = z.object({ access_token: z.string(), token_type: z.string().optional().default("bearer"), user: UserRead }).passthrough();
const ApiError = z.object({ code: z.string(), message: z.string() }).passthrough();
const RegisterRequest = z.object({ email: z.string().email(), password: z.string().min(8) }).passthrough();

export const schemas = {
	UserCreate,
	UserRead,
	ValidationError,
	HTTPValidationError,
	LoginRequest,
	TokenResponse,
	ApiError,
	RegisterRequest,
};

const endpoints = makeApi([
	{
		method: "get",
		path: "/",
		alias: "read_root__get",
		requestFormat: "json",
		response: z.unknown(),
	},
	{
		method: "post",
		path: "/auth/login",
		alias: "login_auth_login_post",
		description: `Authenticates a user and returns a JWT access token.`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				type: "Body",
				schema: LoginRequest
			},
		],
		response: TokenResponse,
		errors: [
			{
				status: 401,
				description: `Invalid email or password`,
				schema: ApiError
			},
			{
				status: 422,
				description: `Validation Error`,
				schema: HTTPValidationError
			},
		]
	},
	{
		method: "post",
		path: "/auth/register",
		alias: "register_auth_register_post",
		description: `Registers a new user account.`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				type: "Body",
				schema: RegisterRequest
			},
		],
		response: TokenResponse,
		errors: [
			{
				status: 400,
				description: `Email already exists`,
				schema: ApiError
			},
			{
				status: 422,
				description: `Validation Error`,
				schema: HTTPValidationError
			},
		]
	},
	{
		method: "post",
		path: "/auth/users",
		alias: "create_user_auth_users_post",
		description: `Small demo route to create a user and return UserRead DTO.`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				type: "Body",
				schema: UserCreate
			},
		],
		response: UserRead,
		errors: [
			{
				status: 422,
				description: `Validation Error`,
				schema: HTTPValidationError
			},
		]
	},
	{
		method: "get",
		path: "/health",
		alias: "health_check_health_get",
		requestFormat: "json",
		response: z.unknown(),
	},
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
    return new Zodios(baseUrl, endpoints, options);
}
