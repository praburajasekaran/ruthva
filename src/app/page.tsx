import { auth } from "@/lib/auth";
import { getClinic, isAdminEmail } from "@/lib/session";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { OnboardingSimulation } from "@/components/landing/OnboardingSimulation";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    // Admin users stay on ruthva admin panel
    if (isAdminEmail(session.user.email)) {
      redirect("/admin");
    }

    // Check if user has a clinic
    const { clinic } = await getClinic();

    if (clinic) {
      // Returning user: redirect via /api/sso/redirect which sets
      // Referrer-Policy: no-referrer to prevent token leaking in the
      // Referer header to third-party resources on clinic-os.
      redirect("/api/sso/redirect");
    } else {
      // New user: send to onboarding
      redirect("/onboarding");
    }
  }

  // Unauthenticated users see the landing page
  return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <OnboardingSimulation />
      <Pricing />
      <Footer />
    </main>
  );
}
