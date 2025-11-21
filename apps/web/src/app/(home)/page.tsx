import { Features } from "@/components/home/features";
import { Footer } from "@/components/home/footer";
import { Hero } from "@/components/home/hero";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
