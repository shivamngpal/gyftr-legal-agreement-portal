import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../generated/prisma/enums";

export interface JwtPayload {
  userId: string;
  role: Role;
}

/**
 * Generates a signed JWT token.
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  });
};

/**
 * Verifies a JWT token and returns its decoded payload.
 * Throws an error if the token is invalid or expired.
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
};
