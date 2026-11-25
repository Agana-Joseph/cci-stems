import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getServerBackendBaseUrl(): string {
  const base =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  return base.replace(/\/+$/, "");
}

function isAdminProxyAllowed(): { ok: boolean; reason?: string; code?: string; status?: number } {
  const isProd = process.env.NODE_ENV === "production";
  const dashboardEnabled = process.env.ADMIN_DASHBOARD_ENABLED;

  if (isProd && dashboardEnabled !== "true") {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      reason:
        "Administrative dashboard proxy is disabled in production until deployment-level access control is configured and ADMIN_DASHBOARD_ENABLED=true is set.",
    };
  }

  if (!process.env.ADMIN_API_KEY) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      reason:
        "ADMIN_API_KEY is not configured on the frontend server. Set ADMIN_API_KEY in server environment variables (never NEXT_PUBLIC_).",
    };
  }

  return { ok: true };
}

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const gate = isAdminProxyAllowed();
  if (!gate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: gate.code ?? "UNAUTHORIZED",
          message: gate.reason ?? "Admin proxy unavailable.",
          details: null,
        },
        request_id: req.headers.get("x-request-id"),
      },
      { status: gate.status ?? 401 }
    );
  }

  const { path } = await context.params;
  // Prevent path traversal
  if (path.some((segment) => segment === ".." || segment.includes("\\"))) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid API path segment.",
          details: null,
        },
        request_id: req.headers.get("x-request-id"),
      },
      { status: 400 }
    );
  }

  const targetUrl = new URL(`${getServerBackendBaseUrl()}/api/v1/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const forwardHeaders = new Headers();
  forwardHeaders.set("X-API-Key", process.env.ADMIN_API_KEY!);

  const actorId = req.headers.get("x-actor-id") || process.env.ADMIN_ACTOR_ID;
  if (actorId) {
    forwardHeaders.set("X-Actor-Id", actorId);
  }

  const requestId = req.headers.get("x-request-id");
  if (requestId) {
    forwardHeaders.set("X-Request-ID", requestId);
  }

  const contentType = req.headers.get("content-type");
  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
    if (contentType) {
      forwardHeaders.set("Content-Type", contentType);
    }
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

    const responseText = await upstream.text();
    const resHeaders = new Headers();
    resHeaders.set("Content-Type", upstream.headers.get("content-type") || "application/json");
    const upstreamReqId = upstream.headers.get("x-request-id");
    if (upstreamReqId) resHeaders.set("X-Request-ID", upstreamReqId);
    const rateLimitRem = upstream.headers.get("x-ratelimit-remaining");
    if (rateLimitRem) resHeaders.set("X-RateLimit-Remaining", rateLimitRem);
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) resHeaders.set("Retry-After", retryAfter);

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_GATEWAY",
          message:
            err instanceof Error
              ? `Failed to reach CCI STEM Connect backend: ${err.message}`
              : "Failed to reach CCI STEM Connect backend.",
          details: null,
        },
        request_id: requestId,
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
