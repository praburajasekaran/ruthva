import { getSession, getClinic, isAdminEmail } from "@/lib/session";
import { createSsoToken } from "@/lib/sso";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * App layout now redirects all non-admin users to clinic-os.
 * The old ruthva dashboard UI is no longer used — clinic-os is the product.
 * Only admin users (matching ADMIN_EMAIL) can access ruthva's /admin pages.
 * The /account page has its own layout and is not affected by this redirect.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Admin users stay on ruthva
  if (isAdminEmail(session.user.email)) {
    return <>{children}</>;
  }

  // Non-admin users: redirect to clinic-os or onboarding
  const { clinic } = await getClinic();
  if (clinic) {
    const { redirectUrl } = await createSsoToken(session.user.id);
    redirect(redirectUrl);
  } else {
    redirect("/onboarding");
  }
}
