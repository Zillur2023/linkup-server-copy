import { z } from "zod";


const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string({ invalid_type_error: "Name is required" }),
    email: z
      .string({ invalid_type_error: "Email is required" })
      .email(),
    password: z
      .string({ invalid_type_error: "Password must be string" })
      // .min(8, "Password must be at least 8 characters long")
      .max(20, { message: "Password can not be more than 20 characters" }),
    phone: z.string({ invalid_type_error: "Phone number is required" }),
    role: z.enum(["admin", "user"]),
    address: z.string({ invalid_type_error: "Address is required" }),
  }),
});

export const userValidations = {
  createUserValidationSchema,
};
