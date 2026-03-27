import { useGetAgent } from "@workspace/api-client-react";
import { Section, Reveal, Button } from "@/components/ui/PremiumComponents";
import { Link } from "wouter";
import { Award, Briefcase, MapPin, Loader2 } from "lucide-react";

export function About() {
  const { data: agent, isLoading } = useGetAgent();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-background">
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal direction="right" className="relative">
            <div className="aspect-[3/4] relative gold-border-glow">
              {/* landing page about professional real estate agent portrait */}
              <img 
                src={agent?.photoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80"} 
                alt="Jane Doe" 
                className="w-full h-full object-cover"
              />
              <div className="absolute -bottom-8 -right-8 bg-card border border-border p-6 hidden md:block">
                <div className="font-display text-4xl text-primary mb-1">{agent?.yearsExperience || 15}+</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Years in Luxury<br/>Real Estate</div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="left" className="space-y-8">
            <div>
              <h1 className="font-display text-5xl md:text-7xl mb-4">{agent?.name || "Jane Doe"}</h1>
              <p className="text-primary tracking-widest uppercase text-sm font-semibold">{agent?.title || "Luxury Real Estate Advisor"}</p>
            </div>

            <div className="prose prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none">
              {agent?.bio ? (
                <p className="whitespace-pre-wrap">{agent.bio}</p>
              ) : (
                <>
                  <p>
                    Jane Doe is synonymous with the pinnacle of luxury real estate. With a career spanning over a decade, she has cultivated an exclusive network of buyers, sellers, and investors across the globe.
                  </p>
                  <p>
                    Known for her unparalleled discretion, sharp negotiation skills, and profound market knowledge, Jane provides a bespoke advisory experience tailored to the unique goals of her high-net-worth clientele. Her philosophy is simple: real estate is not just about transactions; it's about curating a lifestyle and building generational wealth.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
              {agent?.specialties && (
                <div>
                  <div className="flex items-center gap-2 text-foreground mb-4 font-display text-xl">
                    <Briefcase className="w-5 h-5 text-primary" /> Specialties
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {agent.specialties.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              )}
              {agent?.serviceAreas && (
                <div>
                  <div className="flex items-center gap-2 text-foreground mb-4 font-display text-xl">
                    <MapPin className="w-5 h-5 text-primary" /> Areas Served
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {agent.serviceAreas.map(a => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="pt-8">
              <Link href="/contact">
                <Button>Work with Jane</Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
