import { NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import {
  verifyUserPassword,
  getUserByUsername,
  createUser,
  checkUsernameAvailable,
  checkEmailAvailable,
  initDb,
} from "@/lib/db";
import bcrypt from "bcryptjs";

await initDb();

/**
 * POST /api/auth
 * - action: "login"  → validates credentials (admin env OR DB users) → returns signed token
 * - action: "register" → creates a new user account → returns signed token (auto-login)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "login", username, password, email, fullName } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Credenciales incompletas" }, { status: 400 });
    }

    // ——————————————————————————————
    // REGISTRATION
    // ——————————————————————————————
    if (action === "register") {
      if (!email || !fullName) {
        return NextResponse.json(
          { error: "Todos los campos son obligatorios" },
          { status: 400 }
        );
      }

      const trimmedUsername = username.trim().toLowerCase();
      const trimmedEmail = email.trim().toLowerCase();

      // Basic validations
      if (trimmedUsername.length < 3) {
        return NextResponse.json(
          { error: "El usuario debe tener al menos 3 caracteres" },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
        return NextResponse.json(
          { error: "El usuario solo puede tener letras, números, puntos, guiones o guiones bajos" },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres" },
          { status: 400 }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json({ error: "El correo electrónico no es válido" }, { status: 400 });
      }

      // Block registration of the admin username
      const adminUsername = process.env.ADMIN_USERNAME?.toLowerCase();
      if (trimmedUsername === adminUsername) {
        return NextResponse.json(
          { error: "Este nombre de usuario no está disponible" },
          { status: 409 }
        );
      }

      const usernameAvailable = await checkUsernameAvailable(trimmedUsername);
      if (!usernameAvailable) {
        return NextResponse.json(
          { error: "Este nombre de usuario ya está en uso" },
          { status: 409 }
        );
      }

      const emailAvailable = await checkEmailAvailable(trimmedEmail);
      if (!emailAvailable) {
        return NextResponse.json(
          { error: "Este correo electrónico ya está registrado" },
          { status: 409 }
        );
      }

      const newUser = await createUser(trimmedUsername, trimmedEmail, fullName.trim(), password, "user");
      const token = createToken(newUser.id);

      return NextResponse.json({
        success: true,
        token,
        userId: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
      });
    }

    // ——————————————————————————————
    // LOGIN
    // ——————————————————————————————
    const normalizedUsername = username.trim().toLowerCase();

    // First try admin env-var credentials
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword) {
      const usernameMatch = normalizedUsername === adminUsername.toLowerCase();
      const passwordMatch = password === adminPassword;

      if (usernameMatch && passwordMatch) {
        // Ensure admin exists in DB (for data isolation)
        const adminInDb = await getUserByUsername(normalizedUsername);
        let adminId = normalizedUsername;

        if (!adminInDb) {
          const hash = await bcrypt.hash(adminPassword, 12);
          await createUser(normalizedUsername, `${normalizedUsername}@admin.local`, "Administrador", adminPassword, "admin");
        } else {
          adminId = adminInDb.id;
        }

        const token = createToken(adminId);
        return NextResponse.json({
          success: true,
          token,
          userId: adminId,
          username: normalizedUsername,
          fullName: "Administrador",
          role: "admin",
        });
      }
    }

    // Then try DB users
    await new Promise((resolve) => setTimeout(resolve, 150)); // anti-brute-force delay
    const user = await verifyUserPassword(normalizedUsername, password);

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const token = createToken(user.id);
    return NextResponse.json({
      success: true,
      token,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (err: any) {
    console.error("API POST Auth failed:", err);
    return NextResponse.json(
      { error: `Error interno del servidor: ${err.message || err}` },
      { status: 500 }
    );
  }
}
