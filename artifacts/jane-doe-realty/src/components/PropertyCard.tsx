import { Link } from "wouter";
import { formatPrice } from "@/lib/utils";
import { Bed, Bath, Square } from "lucide-react";
import type { Property } from "@workspace/api-client-react";

export function PropertyCard({ property }: { property: Property }) {
  const primaryImage = property.images?.find((img) => img.isPrimary)?.url || property.images?.[0]?.url;

  return (
    <Link href={`/properties/${property.id}`} className="group block gold-border-glow">
      <div className="bg-card overflow-hidden h-full flex flex-col relative">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {property.featured && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 tracking-widest uppercase">
              Featured
            </span>
          )}
          <span className="bg-background/80 backdrop-blur text-foreground text-xs font-bold px-3 py-1 tracking-widest uppercase border border-border">
            {property.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="aspect-[4/3] overflow-hidden relative">
          {/* Default Unsplash architectural placeholder if no image exists */}
          <img
            src={primaryImage || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        
        <div className="p-6 flex flex-col flex-1 border-t border-border/50">
          <div className="text-primary font-display text-2xl mb-2">{formatPrice(property.price)}</div>
          <h3 className="font-display text-xl leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {property.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 line-clamp-1">{property.address}, {property.city}, {property.state}</p>
          
          <div className="mt-auto flex items-center gap-6 text-sm text-foreground/80 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-primary" />
              <span>{property.bedrooms} Beds</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="w-4 h-4 text-primary" />
              <span>{property.bathrooms} Baths</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-primary" />
              <span>{property.sqft.toLocaleString()} Sq Ft</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
