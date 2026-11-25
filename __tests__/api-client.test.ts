import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiClientError, getReadableErrorMessage, publicApiRequest } from "@/lib/api/client";
import { formatPercent, formatScore, maskPhoneNumber } from "@/lib/utils/format";

describe("API client & error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns typed data on standard success envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "X-Request-ID": "req-123" }),
        json: async () => ({
          success: true,
          data: [{ id: "ev-1", title: "CCI STEM Connect" }],
          meta: { total: 1 },
          request_id: "req-123",
        }),
      })
    );

    const res = await publicApiRequest<Array<{ id: string; title: string }>>("/api/v1/events");
    expect(res.success).toBe(true);
    expect(res.data[0]?.title).toBe("CCI STEM Connect");
  });

  it("throws ApiClientError with retryAfterSeconds on 429 rate limits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "Retry-After": "45" }),
        json: async () => ({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded",
            details: { retry_after_seconds: 45 },
          },
          request_id: "req-429",
        }),
      })
    );

    await expect(publicApiRequest("/api/v1/participants/lookup")).rejects.toThrow(ApiClientError);

    try {
      await publicApiRequest("/api/v1/participants/lookup");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(getReadableErrorMessage(err)).toContain("45 seconds");
    }
  });

  it("formats missing scores safely without substituting zero", () => {
    expect(formatScore(null)).toBe("Insufficient data");
    expect(formatScore(undefined)).toBe("Insufficient data");
    expect(formatScore(84.26, 1)).toBe("84.3");
  });

  it("normalises ratio and percentage values", () => {
    expect(formatPercent(0.75)).toBe("75%");
    expect(formatPercent(82.4, 1)).toBe("82.4%");
    expect(formatPercent(null)).toBe("—");
  });

  it("masks phone numbers for restricted display", () => {
    expect(maskPhoneNumber("+2348012345678")).toBe("+234••••678");
    expect(maskPhoneNumber(null)).toBe("—");
  });
});
