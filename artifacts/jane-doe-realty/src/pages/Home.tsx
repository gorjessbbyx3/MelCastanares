import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Star } from "lucide-react";
import { Section, Reveal, Button } from "@/components/ui/PremiumComponents";
import { PropertyCard } from "@/components/PropertyCard";
import { useGetProperties, useGetStats, useGetTestimonials } from "@workspace/api-client-react";
import useEmblaCarousel from "embla-carousel-react";

export function Home() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const { data: propertiesData, isLoading: propsLoading } = useGetProperties({ featured: true, limit: 3 });
  const { data: statsData } = useGetStats();
  const { data: testimonialsData } = useGetTestimonials();
  
  const [emblaRef] = useEmblaCarousel({ loop: true });

  return (
    <div className="bg-background">
      {/* Cinematic Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: y1, opacity }} className="absolute inset-0 z-0">
          {/* landing page hero luxury mansion at twilight */}
          <img 
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=2000&q=90" 
            alt="Luxury Home" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        </motion.div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <h2 className="text-primary text-sm md:text-base tracking-[0.3em] uppercase mb-6">
              Exclusive Living
            </h2>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none text-foreground mb-8">
              Redefining <span className="gold-gradient-text italic">Luxury</span> Real Estate
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-light mb-12 max-w-2xl mx-auto text-balance">
              Experience unparalleled service and access to the world's most extraordinary properties with Jane Doe.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/properties">
                <Button>View Portfolio</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">Consult With Jane</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro / Stats */}
      <Section className="relative z-10 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal direction="right">
            <h2 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
              A Legacy of <br/><span className="text-primary italic">Excellence</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              With a discerning eye for extraordinary properties and an unwavering commitment to client success, Jane Doe has established herself as a leading force in luxury real estate. 
            </p>
            <Link href="/about" className="inline-flex items-center gap-2 text-primary hover:text-white uppercase tracking-widest text-sm font-semibold transition-colors group">
              Meet Jane <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </Reveal>

          <Reveal direction="left" delay={0.2} className="grid grid-cols-2 gap-8">
            <div className="p-8 border border-border bg-card/50 text-center">
              <div className="font-display text-5xl text-primary mb-2">{statsData?.yearsExperience || 15}+</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Years Experience</div>
            </div>
            <div className="p-8 border border-border bg-card/50 text-center">
              <div className="font-display text-5xl text-primary mb-2">${(statsData?.totalSalesVolume || 500) / 1000000}M</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Sales Volume</div>
            </div>
            <div className="p-8 border border-border bg-card/50 text-center">
              <div className="font-display text-5xl text-primary mb-2">{statsData?.clientSatisfactionRate || 99}%</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Client Satisfaction</div>
            </div>
            <div className="p-8 border border-border bg-card/50 text-center">
              <div className="font-display text-5xl text-primary mb-2">{statsData?.homesSold || 350}+</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Properties Sold</div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Featured Properties */}
      <Section className="bg-secondary/30 relative">
        <img src={`${import.meta.env.BASE_URL}images/abstract-gold.png`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none mix-blend-screen" />
        
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between mb-16 relative z-10">
          <div>
            <h3 className="text-primary text-sm tracking-[0.2em] uppercase mb-4">Curated Collection</h3>
            <h2 className="font-display text-4xl md:text-5xl">Featured Properties</h2>
          </div>
          <Link href="/properties" className="hidden md:inline-flex items-center gap-2 text-primary hover:text-white uppercase tracking-widest text-sm font-semibold transition-colors mt-6 md:mt-0 group">
            View All Listings <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
          </Link>
        </Reveal>

        {propsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="aspect-[4/5] bg-card/50 animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {propertiesData?.properties?.map((prop, i) => (
              <Reveal key={prop.id} delay={0.1 * i} direction="up">
                <PropertyCard property={prop} />
              </Reveal>
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center md:hidden relative z-10">
          <Link href="/properties">
            <Button variant="outline" className="w-full">View All Listings</Button>
          </Link>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="border-t border-border overflow-hidden">
        <Reveal className="text-center mb-16">
          <h3 className="text-primary text-sm tracking-[0.2em] uppercase mb-4">Client Success</h3>
          <h2 className="font-display text-4xl md:text-5xl">Words of Praise</h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="embla" ref={emblaRef}>
            <div className="embla__container cursor-grab active:cursor-grabbing">
              {testimonialsData?.testimonials?.map((t) => (
                <div key={t.id} className="embla__slide px-4 md:px-20 py-10">
                  <div className="max-w-4xl mx-auto text-center">
                    <div className="flex justify-center gap-1 mb-8">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="font-display text-2xl md:text-4xl italic text-foreground mb-10 leading-relaxed">
                      "{t.quote}"
                    </p>
                    <div className="font-sans uppercase tracking-widest text-sm text-primary mb-1">
                      {t.clientName}
                    </div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">
                      {t.transactionType} • {t.propertyAddress}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
