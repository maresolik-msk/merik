import { z } from "zod";

export const employeeSchema = z.object({
  emp_code: z.string().trim().min(1, "Employee code is required"),
  full_name: z.string().trim().min(1, "Name is required"),
  department: z.string().trim().optional().or(z.literal("")),
  designation: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  ctc: z.coerce.number().nonnegative("CTC cannot be negative").optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
