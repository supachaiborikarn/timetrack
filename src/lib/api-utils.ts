import { NextResponse } from "next/server";

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
    const response: ApiResponse<T> = {
        success: true,
        data,
    };
    return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
    error: string,
    status = 400,
    code?: string
): NextResponse {
    const response: ApiResponse = {
        success: false,
        error,
        code,
    };
    return NextResponse.json(response, { status });
}

/**
 * Standard error codes used across the API
 */
export const ErrorCodes = {
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    INVALID_LOCATION: "INVALID_LOCATION",
    NO_SHIFT_ASSIGNED: "NO_SHIFT_ASSIGNED",
    ALREADY_CHECKED_IN: "ALREADY_CHECKED_IN",
    NOT_CHECKED_IN: "NOT_CHECKED_IN",
    ALREADY_CHECKED_OUT: "ALREADY_CHECKED_OUT",
} as const;

/**
 * Type-safe error response helpers
 */
export const ApiErrors = {
    unauthorized: (message = "Unauthorized") =>
        errorResponse(message, 401, ErrorCodes.UNAUTHORIZED),

    forbidden: (message = "Forbidden") =>
        errorResponse(message, 403, ErrorCodes.FORBIDDEN),

    notFound: (resource = "Resource") =>
        errorResponse(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),

    validation: (message: string) =>
        errorResponse(message, 400, ErrorCodes.VALIDATION_ERROR),

    internal: (message = "Internal server error") =>
        errorResponse(message, 500, ErrorCodes.INTERNAL_ERROR),
};

/**
 * Handle async route with error catching
 */
export async function withErrorHandling(
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        return await handler();
    } catch (error) {
        console.error("API Error:", error);
        return ApiErrors.internal(
            error instanceof Error ? error.message : "An unexpected error occurred"
        );
    }
}
