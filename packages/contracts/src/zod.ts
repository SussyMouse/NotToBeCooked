import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";




const UserRead = z.object({ email: z.string().email(), display_name: z.union([z.string(), z.null()]).optional(), id: z.string().uuid(), created_at: z.string().datetime({ offset: true }) }).passthrough();
const ApiError = z.object({ code: z.string(), message: z.string() }).passthrough();
const TokenResponse = z.object({ access_token: z.string(), token_type: z.string().optional().default("bearer"), user: UserRead }).passthrough();
const LoginRequest = z.object({ email: z.string().email(), password: z.string().min(8) }).passthrough();
const ValidationError = z.object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string(), input: z.unknown().optional(), ctx: z.object({}).partial().passthrough().optional() }).passthrough();
const HTTPValidationError = z.object({ detail: z.array(ValidationError) }).partial().passthrough();
const RegisterRequest = z.object({ display_name: z.string(), email: z.string().email(), password: z.string().min(8) }).passthrough();
const IngestionResponse = z.object({ file_id: z.string().uuid(), status: z.enum(["processing", "ready", "failed"]), chunk_count: z.union([z.number(), z.null()]).optional(), error: z.union([z.string(), z.null()]).optional() }).passthrough();
const course_id = z.union([z.string(), z.null()]).optional();
const Conversation = z.object({ id: z.union([z.string(), z.null()]).optional(), user_id: z.string().uuid().optional(), title: z.string(), created_at: z.string().datetime({ offset: true }).optional() }).passthrough();
const ChatRole = z.enum(["user", "assistant"]);
const MessageRead = z.object({ id: z.string().uuid(), conversation_id: z.string().uuid(), role: ChatRole, content: z.string(), citations: z.union([z.array(z.object({}).partial().passthrough()), z.null()]), mentioned_file_ids: z.union([z.array(z.string().uuid()), z.null()]), created_at: z.string().datetime({ offset: true }) }).passthrough();
const ConversationDetail = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), title: z.string(), created_at: z.string().datetime({ offset: true }), messages: z.array(MessageRead).optional().default([]) }).passthrough();

export const schemas = {
	UserRead,
	ApiError,
	TokenResponse,
	LoginRequest,
	ValidationError,
	HTTPValidationError,
	RegisterRequest,
	IngestionResponse,
	course_id,
	Conversation,
	ChatRole,
	MessageRead,
	ConversationDetail,
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
		path: "/auth/logout",
		alias: "logout_auth_logout_post",
		description: `Logs out the user by clearing the HttpOnly refresh token cookie.`,
		requestFormat: "json",
		response: z.unknown(),
	},
	{
		method: "get",
		path: "/auth/me",
		alias: "get_me_auth_me_get",
		description: `Returns the current logged-in user&#x27;s profile`,
		requestFormat: "json",
		response: UserRead,
		errors: [
			{
				status: 401,
				description: `Missing, invalid or expired access token`,
				schema: ApiError
			},
		]
	},
	{
		method: "post",
		path: "/auth/refresh",
		alias: "refresh_session_auth_refresh_post",
		description: `Refreshes an expired access token using HttpOnly refresh token cookie.`,
		requestFormat: "json",
		response: TokenResponse,
		errors: [
			{
				status: 401,
				description: `Invalid or expired refresh token`,
				schema: ApiError
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
		method: "get",
		path: "/chat/sessions",
		alias: "get_sessions_chat_sessions_get",
		requestFormat: "json",
		parameters: [
			{
				name: "course_id",
				type: "Query",
				schema: course_id
			},
			{
				name: "limit",
				type: "Query",
				schema: z.number().int().gte(1).lte(100).optional().default(10)
			},
			{
				name: "offset",
				type: "Query",
				schema: z.number().int().gte(0).optional().default(0)
			},
		],
		response: z.array(Conversation),
		errors: [
			{
				status: 401,
				description: `Missing, invalid or expired access token`,
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
		path: "/chat/sessions",
		alias: "create_session_chat_sessions_post",
		requestFormat: "json",
		response: z.unknown(),
	},
	{
		method: "get",
		path: "/chat/sessions/:session_id",
		alias: "get_session_by_id_chat_sessions__session_id__get",
		requestFormat: "json",
		parameters: [
			{
				name: "session_id",
				type: "Path",
				schema: z.string().uuid()
			},
		],
		response: ConversationDetail,
		errors: [
			{
				status: 401,
				description: `Missing, invalid or expired access token`,
				schema: ApiError
			},
			{
				status: 404,
				description: `Session not found`,
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
		method: "delete",
		path: "/chat/sessions/:session_id",
		alias: "delete_session_chat_sessions__session_id__delete",
		requestFormat: "json",
		parameters: [
			{
				name: "session_id",
				type: "Path",
				schema: z.string().uuid()
			},
		],
		response: z.unknown(),
		errors: [
			{
				status: 422,
				description: `Validation Error`,
				schema: HTTPValidationError
			},
		]
	},
	{
		method: "post",
		path: "/files/:file_id/ingest",
		alias: "ingest_file_files__file_id__ingest_post",
		requestFormat: "json",
		parameters: [
			{
				name: "file_id",
				type: "Path",
				schema: z.string().uuid()
			},
		],
		response: IngestionResponse,
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
