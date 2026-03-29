import HeroSection from "@/components/landing/HeroSection";
import ValueCards from "@/components/landing/ValueCards";
import HowItWorks from "@/components/landing/HowItWorks";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ValueCards />
      <HowItWorks />
    </div>
  );
}
