import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { createSsoToken } from "@/lib/sso";
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
    const adminEmails = (process.env.ADMIN_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.includes(session.user.email?.toLowerCase() ?? "")) {
      redirect("/admin");
    }

    // Check if user has a clinic
    const clinic = await db.clinic.findUnique({
      where: { userId: session.user.id },
    });

    if (clinic) {
      // Returning user: generate SSO token and redirect to clinic-os
      const { redirectUrl } = await createSsoToken(session.user.id);
      redirect(redirectUrl);
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
