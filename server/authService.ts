import { db } from "./db";
import { users, passwordResetTokens, loginAttempts } from "../drizzle/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import crypto from "crypto";

// ============ HASH DE SENHA (bcrypt-like usando crypto) ============
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

// ============ VALIDAÇÃO DE FORÇA DE SENHA ============
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("A senha deve ter pelo menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial");
  }
  
  return { valid: errors.length === 0, errors };
}

// ============ RATE LIMITING ============
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function checkRateLimit(email: string, ipAddress?: string): Promise<{ allowed: boolean; remainingAttempts: number; lockoutUntil?: Date }> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
  
  const recentAttempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        gt(loginAttempts.createdAt, cutoffTime),
        eq(loginAttempts.success, false)
      )
    )
    .orderBy(desc(loginAttempts.createdAt));
  
  const failedCount = recentAttempts.length;
  
  if (failedCount >= MAX_ATTEMPTS) {
    const lockoutUntil = new Date(recentAttempts[0].createdAt.getTime() + LOCKOUT_MINUTES * 60 * 1000);
    return { allowed: false, remainingAttempts: 0, lockoutUntil };
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - failedCount };
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
): Promise<void> {
  await db.insert(loginAttempts).values({
    email,
    success,
    ipAddress,
    userAgent,
    failureReason,
  });
}

// ============ LOGIN COM SENHA ============
export async function loginWithPassword(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  // Verificar rate limiting
  const rateLimit = await checkRateLimit(email, ipAddress);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil((rateLimit.lockoutUntil!.getTime() - Date.now()) / 60000);
    return { 
      success: false, 
      error: `Muitas tentativas de login. Tente novamente em ${minutesLeft} minutos.` 
    };
  }
  
  // Buscar usuário
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  if (!user) {
    await recordLoginAttempt(email, false, ipAddress, userAgent, "user_not_found");
    return { success: false, error: "Email ou senha incorretos" };
  }
  
  // Verificar se é usuário com autenticação por senha
  if (user.authMethod !== "password") {
    await recordLoginAttempt(email, false, ipAddress, userAgent, "wrong_auth_method");
    return { success: false, error: "Este usuário utiliza login via OAuth. Use o botão 'Entrar com Manus'." };
  }
  
  // Verificar senha
  if (!user.passwordHash) {
    await recordLoginAttempt(email, false, ipAddress, userAgent, "no_password_set");
    return { success: false, error: "Senha não configurada. Solicite uma nova senha." };
  }
  
  const passwordValid = await verifyPassword(password, user.passwordHash);
  
  if (!passwordValid) {
    await recordLoginAttempt(email, false, ipAddress, userAgent, "invalid_password");
    return { success: false, error: "Email ou senha incorretos" };
  }
  
  // Login bem-sucedido
  await recordLoginAttempt(email, true, ipAddress, userAgent);
  
  // Atualizar último login
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));
  
  return { success: true, user };
}

// ============ CRIAR USUÁRIO COM SENHA ============
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string,
  role: "user" | "admin" = "user",
  createdById?: number
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  // Validar força da senha
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.errors.join(". ") };
  }
  
  // Verificar se email já existe
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  if (existingUser) {
    return { success: false, error: "Este email já está cadastrado" };
  }
  
  // Hash da senha
  const passwordHash = await hashPassword(password);
  
  // Criar usuário
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      authMethod: "password",
      role,
      emailVerified: true, // Admin criou, então já está verificado
      openId: `local_${crypto.randomBytes(16).toString("hex")}`, // ID único para usuários locais
    })
    .$returningId();
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, newUser.id));
  
  return { success: true, user };
}

// ============ ALTERAR SENHA ============
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Buscar usuário
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user || user.authMethod !== "password") {
    return { success: false, error: "Usuário não encontrado ou não utiliza autenticação por senha" };
  }
  
  // Verificar senha atual
  if (!user.passwordHash) {
    return { success: false, error: "Senha atual não configurada" };
  }
  
  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    return { success: false, error: "Senha atual incorreta" };
  }
  
  // Validar nova senha
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.errors.join(". ") };
  }
  
  // Atualizar senha
  const newPasswordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  
  return { success: true };
}

// ============ RECUPERAÇÃO DE SENHA ============
export async function createPasswordResetToken(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  // Buscar usuário
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  if (!user) {
    // Não revelar se o email existe ou não
    return { success: true };
  }
  
  if (user.authMethod !== "password") {
    // Não revelar que o usuário usa OAuth
    return { success: true };
  }
  
  // Gerar token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  
  // Salvar token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });
  
  return { success: true, token };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  // Buscar token válido
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    );
  
  if (!resetToken) {
    return { success: false, error: "Token inválido ou expirado" };
  }
  
  if (resetToken.usedAt) {
    return { success: false, error: "Este link já foi utilizado" };
  }
  
  // Validar nova senha
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.errors.join(". ") };
  }
  
  // Atualizar senha
  const newPasswordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, resetToken.userId));
  
  // Marcar token como usado
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));
  
  return { success: true };
}

// ============ LISTAR USUÁRIOS (ADMIN) ============
export async function listUsers(): Promise<typeof users.$inferSelect[]> {
  return db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
}

// ============ ATUALIZAR USUÁRIO (ADMIN) ============
export async function updateUser(
  userId: number,
  data: { name?: string; email?: string; role?: "user" | "admin" }
): Promise<{ success: boolean; error?: string }> {
  // Verificar se email já existe (se estiver alterando)
  if (data.email) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));
    
    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: "Este email já está em uso" };
    }
  }
  
  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId));
  
  return { success: true };
}

// ============ EXCLUIR USUÁRIO (ADMIN) ============
export async function deleteUser(userId: number, currentUserId: number): Promise<{ success: boolean; error?: string }> {
  if (userId === currentUserId) {
    return { success: false, error: "Você não pode excluir sua própria conta" };
  }
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user) {
    return { success: false, error: "Usuário não encontrado" };
  }
  
  // Não permitir excluir usuários OAuth (owner)
  if (user.authMethod === "oauth") {
    return { success: false, error: "Não é possível excluir usuários que utilizam OAuth" };
  }
  
  await db.delete(users).where(eq(users.id, userId));
  
  return { success: true };
}

// ============ RESETAR SENHA (ADMIN) ============
export async function adminResetPassword(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user) {
    return { success: false, error: "Usuário não encontrado" };
  }
  
  if (user.authMethod !== "password") {
    return { success: false, error: "Este usuário utiliza OAuth e não pode ter a senha redefinida" };
  }
  
  // Validar nova senha
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.errors.join(". ") };
  }
  
  const newPasswordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  
  return { success: true };
}
