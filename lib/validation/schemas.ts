import { z } from "zod";

export const participantVerifySchema = z
  .object({
    phone: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => Boolean(data.phone?.trim() || data.email?.trim()), {
    message: "Please provide either your registered phone number or email address.",
    path: ["phone"],
  });

export const participantProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  current_role: z.string().trim().min(2, "Current professional role is required."),
  industry: z.string().trim().min(2, "Industry is required."),
  organisation: z.string().trim().optional().or(z.literal("")),
  years_of_experience: z.string().trim().optional().or(z.literal("")),
  reason_for_attending: z.string().trim().optional().or(z.literal("")),
});

export const eventFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  title: z.string().trim().min(2, "Event title is required.").max(240),
  description: z.string().trim().optional(),
  event_type: z.string().trim().optional(),
  event_date: z.string().min(1, "Event date is required."),
  end_date: z.string().optional(),
  location: z.string().trim().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]),
});

export const participantCreateSchema = z
  .object({
    full_name: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
    phone: z.string().trim().optional().or(z.literal("")),
    current_role: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    organisation: z.string().trim().optional(),
    years_of_experience: z.string().trim().optional(),
    reason_for_attending: z.string().trim().optional(),
    event_id: z.string().optional(),
  })
  .refine((d) => Boolean(d.phone?.trim() || d.email?.trim()), {
    message: "Provide at least a phone number or email address.",
    path: ["phone"],
  });

export const questionCardSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Card code is required.")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens, or underscores."),
  title: z.string().trim().min(2, "Title is required."),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  display_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
});

export const questionFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Question code is required.")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens, or underscores."),
  question_text: z.string().trim().min(3, "Question text is required."),
  description: z.string().trim().optional(),
  question_type: z.enum([
    "short_text",
    "long_text",
    "email",
    "phone",
    "single_choice",
    "multiple_choice",
    "yes_no",
    "rating_scale",
    "numeric",
    "date",
  ]),
  category: z.string().trim().optional(),
  card_id: z.string().optional().nullable(),
  is_required: z.boolean(),
  is_scorable: z.boolean(),
  allow_explanation: z.boolean(),
  explanation_prompt: z.string().trim().optional(),
  min_value: z.string().trim().optional(),
  max_value: z.string().trim().optional(),
  display_order: z.coerce.number().int().min(0),
});
