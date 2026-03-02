import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { OnboardingSimulation } from "@/components/landing/OnboardingSimulation";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  const session = await auth();

  // Only redirect logged-in users straight to their dashboard.
  // Unauthenticated users stay on the landing page.
  if (session) {
    redirect("/dashboard");
  }

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
