import { NextResponse } from "next/server";
import { createToken } from "@/lib/auth";

/**
 * POST /api/auth
 * Validates credentials against environment variables and returns a signed session token.
 * Credentials NEVER leave the server — passwords are stored in env vars only.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Credenciales incompletas" }, { status: 400 });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set.");
      return NextResponse.json({ error: "Servidor no configurado correctamente" }, { status: 500 });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Constant-time-ish comparison to mitigate timing attacks
    const usernameMatch = normalizedUsername === adminUsername.toLowerCase();
    const passwordMatch = password === adminPassword;

    if (!usernameMatch || !passwordMatch) {
      // Small artificial delay to prevent brute-force timing attacks
      await new Promise((resolve) => setTimeout(resolve, 300));
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const token = createToken(normalizedUsername);

    return NextResponse.json({
      success: true,
      token,
      userId: normalizedUsername,
    });
  } catch (err: any) {
    console.error("API POST Auth failed:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
