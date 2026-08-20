import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";




const UserRead = z.object({ email: z.string().email(), display_name: z.union([z.string(), z.null()]).optional(), id: z.string().uuid(), created_at: z.string().datetime({ offset: true }) }).passthrough();
const ApiError = z.object({ code: z.string(), message: z.string() }).passthrough();
const TokenResponse = z.object({ access_token: z.string(), token_type: z.string().optional().default("bearer"), user: UserRead }).passthrough();
const LoginRequest = z.object({ email: z.string().email(), password: z.string().min(8) }).passthrough();
const ValidationError = z.object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string(), input: z.unknown().optional(), ctx: z.object({}).partial().passthrough().optional() }).passthrough();
const HTTPValidationError = z.object({ detail: z.array(ValidationError) }).partial().passthrough();
const RegisterRequest = z.object({ display_name: z.string(), email: z.string().email(), password: z.string().min(8) }).passthrough();
const IngestionResponse = z.object({ file_id: z.string().uuid(), status: z.enum(["uploaded", "processing", "ready", "failed"]), chunk_count: z.union([z.number(), z.null()]).optional(), error: z.union([z.string(), z.null()]).optional() }).passthrough();
const RagQueryRequest = z.object({ question: z.string().min(1).max(2000), course_id: z.union([z.string(), z.null()]).optional(), conversation_id: z.union([z.string(), z.null()]).optional(), file_ids: z.union([z.array(z.string().uuid()), z.null()]).optional(), top_k: z.union([z.number(), z.null()]).optional().default(5) });
const Citation = z.object({ marker: z.number().int().gte(1), file_id: z.string().uuid(), course_id: z.string().uuid(), filename: z.string().min(1), page: z.union([z.number(), z.null()]).optional(), page_end: z.union([z.number(), z.null()]).optional(), quote: z.string().min(1) });
const RagAnswer = z.object({ answer: z.string().min(1), citations: z.array(Citation).optional(), grounded: z.boolean(), used_chunks: z.number().int().gte(0) });
const course_id = z.union([z.string(), z.null()]).optional();
const Conversation = z.object({ id: z.union([z.string(), z.null()]).optional(), course_id: z.string().uuid(), title: z.string().optional().default("Untitled Conversation"), created_at: z.string().datetime({ offset: true }).optional(), updated_at: z.string().datetime({ offset: true }).optional() }).passthrough();
const ChatRole = z.enum(["user", "assistant"]);
const MessageRead = z.object({ id: z.string().uuid(), conversation_id: z.string().uuid(), scope_course_id: z.string().uuid(), role: ChatRole, content: z.string(), grounded: z.boolean(), citations: z.union([z.array(z.object({}).partial().passthrough()), z.null()]), mentioned_file_ids: z.union([z.array(z.string().uuid()), z.null()]), created_at: z.string().datetime({ offset: true }) }).passthrough();
const ConversationDetail = z.object({ id: z.string().uuid(), course_id: z.string().uuid(), title: z.string(), created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }), messages: z.array(MessageRead).optional().default([]) }).passthrough();

export const schemas = {
	UserRead,
	ApiError,
	TokenResponse,
	LoginRequest,
	ValidationError,
	HTTPValidationError,
	RegisterRequest,
	IngestionResponse,
	RagQueryRequest,
	Citation,
	RagAnswer,
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
		description: `Get any latest sessions or by course ID`,
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
		method: "get",
		path: "/chat/sessions/:session_id",
		alias: "get_session_by_session_id_chat_sessions__session_id__get",
		description: `Get session messages`,
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
		response: z.record(z.string(), z.unknown()),
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
	{
		method: "post",
		path: "/rag/query",
		alias: "query_rag_query_post",
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				type: "Body",
				schema: RagQueryRequest
			},
		],
		response: RagAnswer,
		errors: [
			{
				status: 422,
				description: `Validation Error`,
				schema: HTTPValidationError
			},
		]
	},
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
    return new Zodios(baseUrl, endpoints, options);
}
