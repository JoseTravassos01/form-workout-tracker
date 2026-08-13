import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(256),
}).strict();
