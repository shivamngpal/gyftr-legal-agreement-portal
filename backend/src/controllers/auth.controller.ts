import { Request, Response } from "express";
import { loginSchema } from "../utils/validation";
import { AuthService } from "../services/auth.service";
import { z } from "zod";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await AuthService.login(data);

    if (!result) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: (error as any).errors,
      });
      return;
    }

    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
