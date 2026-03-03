import { z } from 'zod';

const FormFieldConfigSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'file', 'select', 'textarea', 'number', 'info', 'checkbox']),
    options: z.array(z.string()).optional(),
    required: z.boolean().default(false),
    placeholder: z.string().optional()
});

const EventFormConfigSchema = z.object({
    askTeamName: z.boolean().default(false),
    askPptUrl: z.boolean().default(false),
    askSoundReqs: z.boolean().default(false),
    askRobotSpecs: z.boolean().default(false),
    minTeamSize: z.number().int().min(1).default(1),
    maxTeamSize: z.number().int().min(1).default(1),
    customFields: z.array(FormFieldConfigSchema).optional().default([])
});

export const EventSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    imagePosterUrl: z.string().url("Invalid Poster URL").optional().or(z.literal('')),

    // Economics
    entryFeeInr: z.number().min(0).default(0),
    entryFeeAft: z.number().min(0).default(0),
    rewardAft: z.number().min(0).optional(),

    // Status
    registrationStatus: z.enum(['open', 'closed', 'coming_soon']).default('open'),

    // Rules
    minTeamSize: z.number().int().min(1).default(1),
    maxTeamSize: z.number().int().min(1).default(1),

    // Config
    formConfig: EventFormConfigSchema,

    // Administration & Resources
    coordinators: z.array(z.string().email())
        .default([])
        .describe("List of Coordinator Emails"),
    rulebookUrl: z.string().url().optional().or(z.literal('')),
    samplePptUrl: z.string().url().optional().or(z.literal('')),

    createdAt: z.any().optional(),
});

export type EventInput = z.infer<typeof EventSchema>;
