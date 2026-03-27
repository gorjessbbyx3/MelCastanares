import { Link } from "wouter";
import { Button } from "@/components/ui/PremiumComponents";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-8xl md:text-9xl text-primary mb-6 opacity-20">404</h1>
      <h2 className="font-display text-4xl mb-4">Page Not Found</h2>
      <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link href="/">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
