import { Link } from "wouter";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useGetAgent } from "@workspace/api-client-react";

export function Footer() {
  const { data: agent } = useGetAgent();

  return (
    <footer className="bg-secondary pt-24 pb-12 border-t border-border">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8">
        
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
              alt="Jane Doe Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-display text-2xl uppercase tracking-widest text-primary">
              Jane Doe
            </span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Curating extraordinary living experiences. Discretion, expertise, and unparalleled service in luxury real estate.
          </p>
          <div className="flex gap-4">
            <a href={agent?.instagram || "#"} className="text-foreground hover:text-primary transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href={agent?.linkedin || "#"} className="text-foreground hover:text-primary transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href={agent?.facebook || "#"} className="text-foreground hover:text-primary transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg uppercase tracking-widest mb-6">Explore</h4>
          <ul className="space-y-4 text-sm tracking-wider">
            <li><Link href="/properties" className="text-muted-foreground hover:text-primary transition-colors">Exclusive Listings</Link></li>
            <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">The Agent</Link></li>
            <li><Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors">Market Insights</Link></li>
            <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Connect</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display text-lg uppercase tracking-widest mb-6">Contact</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <a href={`tel:${agent?.phone || "+1234567890"}`} className="hover:text-primary transition-colors">
                {agent?.phone || "+1 (555) 123-4567"}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary shrink-0" />
              <a href={`mailto:${agent?.email || "jane@example.com"}`} className="hover:text-primary transition-colors">
                {agent?.email || "jane.doe@luxuryrealty.com"}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <span>
                {agent?.brokerage || "Jane Doe Realty"}<br/>
                {agent?.brokerageAddress || "100 Luxury Way, Beverly Hills, CA 90210"}
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 mt-24 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} Jane Doe Realty. All Rights Reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
