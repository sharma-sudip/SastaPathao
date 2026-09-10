import { z } from "zod";

// Shared client/server schemas -- the single source of truth for form shape,
// used by both the client form components (for inline errors) and the
// Server Actions that receive the submitted FormData.

export const postFormSchema = z.object({
  origin: z.string().trim().min(2, "Enter a pickup location.").max(200),
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
  destination: z.string().trim().min(2, "Enter a destination.").max(200),
  destLat: z.coerce.number().min(-90).max(90).optional(),
  destLng: z.coerce.number().min(-180).max(180).optional(),
  departAt: z
    .string()
    .min(1, "Choose a date and time.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

export const claimFormSchema = z.object({
  postId: z.string().uuid(),
  message: z.string().trim().max(300).optional().or(z.literal("")),
});

export const messageFormSchema = z.object({
  claimId: z.string().uuid(),
  body: z.string().trim().min(1, "Type a message.").max(1000, "Keep it under 1000 characters."),
});

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9()+\-.\s]{7,20}$/, "Enter a valid phone number.");
