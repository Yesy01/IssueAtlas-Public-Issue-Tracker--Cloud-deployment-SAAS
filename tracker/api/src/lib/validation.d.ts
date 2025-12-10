import { z } from "zod";
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const IssueCreateSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<{
        pothole: "pothole";
        streetlight: "streetlight";
        drainage: "drainage";
        other: "other";
    }>;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    address: z.ZodOptional<z.ZodString>;
    areaName: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const IssueUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        pothole: "pothole";
        streetlight: "streetlight";
        drainage: "drainage";
        other: "other";
    }>>;
    address: z.ZodOptional<z.ZodString>;
    areaName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const IssueStatusUpdateSchema: z.ZodObject<{
    newStatus: z.ZodEnum<{
        new: "new";
        triaged: "triaged";
        in_progress: "in_progress";
        resolved: "resolved";
    }>;
}, z.core.$strip>;
export type IssueStatusUpdateInput = z.infer<typeof IssueStatusUpdateSchema>;
export declare const CommentCreateSchema: z.ZodObject<{
    body: z.ZodString;
}, z.core.$strip>;
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type IssueCreateInput = z.infer<typeof IssueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof IssueUpdateSchema>;
//# sourceMappingURL=validation.d.ts.map