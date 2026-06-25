import { prisma } from "../config/db";
import { comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { LoginRequest } from "../utils/validation";

export class AuthService {
  static async login(data: LoginRequest) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }
}
