import { useState } from "react";
import { useGetProperties } from "@workspace/api-client-react";
import { Section, Reveal, Input, Button } from "@/components/ui/PremiumComponents";
import { PropertyCard } from "@/components/PropertyCard";
import { Search, SlidersHorizontal } from "lucide-react";

export function Properties() {
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  const { data, isLoading } = useGetProperties({
    ...(filters.status && { status: filters.status as any }),
    ...(filters.type && { type: filters.type as any }),
    ...(filters.minPrice && { minPrice: Number(filters.minPrice) }),
    ...(filters.maxPrice && { maxPrice: Number(filters.maxPrice) }),
    limit: 12,
  });

  return (
    <div className="pt-24 min-h-screen bg-background">
      <Section className="pb-12">
        <Reveal>
          <h1 className="font-display text-5xl md:text-7xl mb-6">Portfolio</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mb-12">
            Discover a curated selection of extraordinary properties. Use the filters below to refine your search.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="bg-card p-6 border border-border mb-12 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Status</label>
            <select 
              className="w-full bg-input/50 border-b border-border px-4 py-3 text-foreground focus:outline-none focus:border-primary appearance-none rounded-none"
              value={filters.status}
              onChange={(e) => setFilters(p => ({...p, status: e.target.value}))}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Type</label>
            <select 
              className="w-full bg-input/50 border-b border-border px-4 py-3 text-foreground focus:outline-none focus:border-primary appearance-none rounded-none"
              value={filters.type}
              onChange={(e) => setFilters(p => ({...p, type: e.target.value}))}
            >
              <option value="">All Types</option>
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="luxury">Luxury Estate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Min Price</label>
            <Input 
              type="number" 
              placeholder="e.g. 1000000"
              value={filters.minPrice}
              onChange={(e) => setFilters(p => ({...p, minPrice: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Max Price</label>
            <Input 
              type="number" 
              placeholder="No Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters(p => ({...p, maxPrice: e.target.value}))}
            />
          </div>
          <Button className="w-full h-[50px]">
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </Reveal>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-[4/5] bg-card/50 animate-pulse border border-border" />
            ))}
          </div>
        ) : data?.properties.length === 0 ? (
          <div className="text-center py-24 border border-border border-dashed">
            <SlidersHorizontal className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-2xl mb-2">No properties found</h3>
            <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            <Button variant="outline" className="mt-6" onClick={() => setFilters({status:'', type:'', minPrice:'', maxPrice:''})}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data?.properties.map((prop, i) => (
              <Reveal key={prop.id} delay={0.05 * i} direction="up">
                <PropertyCard property={prop} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
