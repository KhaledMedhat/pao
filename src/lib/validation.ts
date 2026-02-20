import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  username: z.string(),
});

export const setObsessionSchema = z.object({
  obsession: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const editGroupSchema = z.object({
  groupLogo: z.instanceof(File).optional(),
  groupName: z.string().optional(),
});

export const signupStep1Schema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number"),
    confirmPassword: z.string(),
    agreeTerms: z.literal(true, {
      message: "You must agree to the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signupStep2Schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores allowed"),
  profileImage: z.instanceof(File).optional(),
});

export const googleSignupCompletionSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores allowed"),
});

export const invitationServerJoinSchema = z.object({
  invitationLink: z.string().min(1, "Invitation link is required"),
});

export const createServerSchema = z.object({
  serverName: z.string().min(1, "Server name is required"),
  serverImage: z.instanceof(File).optional(),
});

export type SendFriendRequestValues = z.infer<typeof sendFriendRequestSchema>;
export type EditGroupValues = z.infer<typeof editGroupSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupStep1Values = z.infer<typeof signupStep1Schema>;
export type SignupStep2Values = z.infer<typeof signupStep2Schema>;
export type GoogleSignupCompletionValues = z.infer<typeof googleSignupCompletionSchema>;
export type InvitationServerJoinValues = z.infer<typeof invitationServerJoinSchema>;
export type CreateServerValues = z.infer<typeof createServerSchema>;
export type SetObsessionValues = z.infer<typeof setObsessionSchema>;