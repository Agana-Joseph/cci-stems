import { describe, expect, it } from "vitest";
import {
  eventFormSchema,
  participantProfileSchema,
  participantVerifySchema,
} from "@/lib/validation/schemas";

describe("Zod validation schemas", () => {
  it("requires either phone or email for participant verification", () => {
    expect(participantVerifySchema.safeParse({ phone: "", email: "" }).success).toBe(false);
    expect(participantVerifySchema.safeParse({ phone: "08012345678", email: "" }).success).toBe(
      true
    );
    expect(participantVerifySchema.safeParse({ phone: "", email: "ada@example.com" }).success).toBe(
      true
    );
  });

  it("validates event slugs strictly", () => {
    const valid = eventFormSchema.safeParse({
      slug: "cci-stem-lagos-2026",
      title: "CCI STEM Connect Lagos 2026",
      event_date: "2026-11-24",
      status: "active",
    });
    expect(valid.success).toBe(true);

    const invalidSlug = eventFormSchema.safeParse({
      slug: "Invalid Slug!",
      title: "Event",
      event_date: "2026-11-24",
      status: "active",
    });
    expect(invalidSlug.success).toBe(false);
  });

  it("validates participant profile required fields", () => {
    const res = participantProfileSchema.safeParse({
      full_name: "Adaeze Okafor",
      current_role: "Senior Data Engineer",
      industry: "FinTech",
      years_of_experience: "6",
    });
    expect(res.success).toBe(true);
  });
});
