import { auth } from "./auth";
import { db } from "./db";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  // After the redirect guard, user and id are guaranteed
  return session as typeof session & { user: { id: string; email: string } };
}

export async function getClinic() {
  const session = await getSession();
  const clinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  return { session, clinic };
}

export async function requireClinic() {
  const { session, clinic } = await getClinic();
  if (!clinic) {
    redirect("/onboarding");
  }
  return { session, clinic };
}

/**
 * Check whether the given email is in the ADMIN_EMAIL allow-list.
 * Pure logic — no redirects, so it can be reused in any context.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email?.toLowerCase() ?? "");
}

export async function requireAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session.user.email)) {
    redirect("/patients");
  }
  return session;
}
