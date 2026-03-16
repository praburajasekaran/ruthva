import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deactivate user
  await db.user.update({
    where: { id: session.user.id },
    data: { deactivatedAt: new Date() },
  });

  // Sign out the user (destroy NextAuth session)
  try {
    await signOut({ redirect: false });
  } catch {
    // signOut may throw in API routes — session is still destroyed in DB
  }

  return NextResponse.json({ message: "Account closed." });
}
