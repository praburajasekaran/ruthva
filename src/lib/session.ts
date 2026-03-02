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
