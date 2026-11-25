import type { ApiFailure, ApiSuccess } from "@/types/api";

/**
 * CCI STEM Connect API Client
 * @author JoJeGa
 */
export const CLIENT_SIGNATURE = "JoJeGa" as const;

/**
 * Resolve public backend base URL from env.
 * Supports NEXT_PUBLIC_API_BASE_URL (spec) and NEXT_PUBLIC_API_URL (API guide).
 */
export function getPublicApiBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  return base.replace(/\/+$/, "");
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: unknown = null,
    public requestId: string | null = null,
    public retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function getReadableErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429 || error.code === "RATE_LIMIT_EXCEEDED") {
      const wait = error.retryAfterSeconds
        ? ` Please wait ${error.retryAfterSeconds} seconds and try again.`
        : " Please wait a moment and try again.";
      return `Too many requests.${wait}`;
    }
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      return "Administrative API access is unauthorised. Check the server-side ADMIN_API_KEY configuration.";
    }
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return "You do not have permission to perform this administrative operation.";
    }
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return error.message || "The requested record could not be found.";
    }
    if (error.status === 409 || error.code === "CONFLICT") {
      return error.message || "This record conflicts with an existing entry.";
    }
    if (error.status === 422) {
      if (
        error.details &&
        typeof error.details === "object" &&
        "missing_question_codes" in error.details &&
        Array.isArray((error.details as { missing_question_codes: unknown }).missing_question_codes)
      ) {
        const codes = (error.details as { missing_question_codes: string[] })
          .missing_question_codes;
        return `Please complete all required questions before submitting (${codes.length} remaining).`;
      }
      return error.message || "Some submitted fields failed validation. Please review and try again.";
    }
    return error.message || "An unexpected API error occurred.";
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "Unable to reach the CCI STEM Connect API server. Please verify your connection and backend configuration.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

async function executeRequest<T>(url: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { params, body, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const fullUrl = `${url}${buildQueryString(params)}`;

  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : undefined;

  const res = await fetch(fullUrl, {
    ...rest,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(requestId ? { "X-Request-ID": requestId } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  const retryHeader = res.headers.get("Retry-After");
  const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : null;

  let payload: ApiSuccess<T> | ApiFailure | null = null;
  try {
    payload = (await res.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    if (!res.ok) {
      throw new ApiClientError(
        res.status,
        "HTTP_ERROR",
        res.statusText || `Request failed with status ${res.status}`,
        null,
        res.headers.get("X-Request-ID"),
        Number.isNaN(retryAfter ?? NaN) ? null : retryAfter
      );
    }
  }

  if (!res.ok || !payload || !payload.success) {
    const errObj =
      payload && !payload.success
        ? payload.error
        : {
            code: "HTTP_ERROR",
            message: res.statusText || `Request failed with status ${res.status}`,
            details: null,
          };

    const detailsRetry =
      errObj.details &&
      typeof errObj.details === "object" &&
      "retry_after_seconds" in errObj.details &&
      typeof (errObj.details as { retry_after_seconds?: unknown }).retry_after_seconds === "number"
        ? (errObj.details as { retry_after_seconds: number }).retry_after_seconds
        : null;

    throw new ApiClientError(
      res.status,
      errObj.code,
      errObj.message,
      errObj.details,
      payload?.request_id ?? res.headers.get("X-Request-ID"),
      detailsRetry ?? (Number.isNaN(retryAfter ?? NaN) ? null : retryAfter)
    );
  }

  return payload;
}

/**
 * Public API request directly against the FastAPI backend (/api/v1/...).
 * Never sends administrative credentials.
 */
export async function publicApiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiSuccess<T>> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return executeRequest<T>(`${getPublicApiBaseUrl()}${normalizedPath}`, options);
}

/**
 * Administrative API request proxied through Next.js server route (/api/admin/...).
 * The server route injects X-API-Key from process.env.ADMIN_API_KEY so secrets
 * are never exposed to client-side browser bundles.
 */
export async function adminApiRequest<T>(
  apiV1SubPath: string,
  options: RequestOptions = {}
): Promise<ApiSuccess<T>> {
  const cleaned = apiV1SubPath
    .replace(/^\/api\/v1\//, "")
    .replace(/^\/+/, "");
  return executeRequest<T>(`/api/admin/${cleaned}`, options);
}
