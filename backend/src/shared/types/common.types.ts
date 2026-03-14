/**
 * Shared response shape types used across all modules.
 */

/** Standard success response wrapper */
export interface ApiResponse<T> {
  data: T;
}

/** Standard list response wrapper */
export interface ApiListResponse<T> {
  data: T[];
  count: number;
}

/** Standard error response shape */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** Pagination query params */
export interface PaginationParams {
  page?: number;
  limit?: number;
}
