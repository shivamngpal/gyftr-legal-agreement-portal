import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password securely.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plaintext password with a hashed password to verify a match.
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
