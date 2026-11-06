import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

const sessionConfig = {
  password: process.env["SESSION_SECRET"]!, // server-only; encrypts the session cookie
  name: "admin-gate",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

type AdminSession = { unlocked?: boolean };

async function digest(value: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(buf);
}

// Constant-time comparison over equal-length SHA-256 digests so the password
// length and content never leak through timing.
function digestsMatch(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD is not set");

    const [given, wanted] = await Promise.all([digest(data.password), digest(expected)]);
    if (!digestsMatch(given, wanted)) return { ok: false as const };

    const session = await useSession<AdminSession>(sessionConfig);
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

// Status check without redirecting — used by the login page to skip the form
// when the admin is already unlocked.
export const getAdminSessionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  return { unlocked: session.data.unlocked === true };
});

// Gate for protected routes: throws a redirect BEFORE any protected work runs.
export const requireAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  if (!session.data.unlocked) throw redirect({ to: "/admin/login" });
  return { unlocked: true as const };
});

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});
