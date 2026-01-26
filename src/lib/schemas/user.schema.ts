import { z } from 'zod';

export const UserSchema = z.object({
    uid: z.string().min(1, "User ID is required"),
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    registrationNumber: z.string().min(5, "Invalid Registration Number").toUpperCase(),

    // Academic Details
    branch: z.string().min(2, "Branch is required"),
    section: z.string().min(1, "Section is required"),
    batchYear: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-YY (e.g. 2021-25)"),
    currentSemester: z.number().int().min(1).max(8).optional(),

    // Roles & Permissions
    role: z.enum(['student', 'admin', 'faculty', 'cr']).default('student'),

    // Metadata
    walletAddress: z.string().optional(),
    isOnboarded: z.boolean().default(false),
    createdAt: z.any().optional(), // ServerTimestamp
});

export const BulkCreateSchema = z.object({
    prefix: z.string().length(8, "Prefix must be 8 characters (e.g. 21331A05)"),
    startReg: z.number().int().min(1),
    endReg: z.number().int().min(1),
    branch: z.string(),
    section: z.string(),
    year: z.string(),
    semester: z.number().int().min(1)
}).refine(data => data.endReg >= data.startReg, {
    message: "End Reg must be greater than Start Reg",
    path: ["endReg"]
});

export type UserProfile = z.infer<typeof UserSchema>;
export type BulkCreateInput = z.infer<typeof BulkCreateSchema>;
