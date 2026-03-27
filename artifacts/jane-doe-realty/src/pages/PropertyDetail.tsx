import { useParams, Link } from "wouter";
import { useGetProperty, useSubmitContact } from "@workspace/api-client-react";
import { Section, Reveal, Button, Input, Textarea } from "@/components/ui/PremiumComponents";
import { formatPrice } from "@/lib/utils";
import { Bed, Bath, Square, MapPin, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const contactSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message too short"),
});

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading } = useGetProperty(id!);
  const { mutate: submitContact, isPending, isSuccess } = useSubmitContact();

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    submitContact({
      data: {
        ...data,
        inquiryType: "buying",
        propertyId: id
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="font-display text-4xl mb-4">Property Not Found</h1>
        <p className="text-muted-foreground mb-8">This listing may have been removed or is no longer available.</p>
        <Link href="/properties"><Button>Return to Portfolio</Button></Link>
      </div>
    );
  }

  const primaryImage = property.images?.find((img) => img.isPrimary)?.url || property.images?.[0]?.url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80";

  return (
    <div className="pt-24 min-h-screen bg-background pb-24">
      {/* Header Info */}
      <Section className="pb-8">
        <Link href="/properties" className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Listings
        </Link>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
          <div>
            <div className="flex gap-3 mb-4">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 tracking-widest uppercase">
                {property.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl mb-4">{property.title}</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> {property.address}, {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <div className="text-left lg:text-right">
            <div className="font-display text-5xl text-primary">{formatPrice(property.price)}</div>
            {property.mlsNumber && <div className="text-muted-foreground text-sm mt-2">MLS: {property.mlsNumber}</div>}
          </div>
        </div>
      </Section>

      {/* Main Image */}
      <div className="px-6 md:px-12 max-w-[1600px] mx-auto mb-16">
        <Reveal>
          <div className="aspect-[21/9] w-full overflow-hidden border border-border">
            <img src={primaryImage} alt={property.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000" />
          </div>
        </Reveal>
      </div>

      <Section className="pt-0 grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Left Col - Details */}
        <div className="lg:col-span-2 space-y-16">
          <Reveal>
            <div className="grid grid-cols-3 gap-6 py-8 border-y border-border text-center">
              <div>
                <Bed className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-display text-3xl">{property.bedrooms}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Bedrooms</div>
              </div>
              <div className="border-x border-border">
                <Bath className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-display text-3xl">{property.bathrooms}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Bathrooms</div>
              </div>
              <div>
                <Square className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-display text-3xl">{property.sqft.toLocaleString()}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Square Feet</div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <h3 className="font-display text-3xl mb-6">About This Property</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {property.description || "No description provided for this property."}
            </p>
          </Reveal>

          {property.amenities && property.amenities.length > 0 && (
            <Reveal>
              <h3 className="font-display text-3xl mb-6">Amenities</h3>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map(am => (
                  <li key={am} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {am}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {/* Additional Images Grid */}
          {property.images && property.images.length > 1 && (
            <Reveal>
              <h3 className="font-display text-3xl mb-6">Gallery</h3>
              <div className="grid grid-cols-2 gap-4">
                {property.images.filter(img => !img.isPrimary).map((img, i) => (
                  <img key={i} src={img.url} alt="" className="w-full aspect-[4/3] object-cover border border-border" />
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {/* Right Col - Contact Sidebar */}
        <Reveal direction="left" className="relative">
          <div className="sticky top-32 bg-card border border-border p-8 gold-border-glow">
            <h3 className="font-display text-2xl mb-2">Inquire About This Property</h3>
            <p className="text-sm text-muted-foreground mb-8">Contact Jane to schedule a private showing or request more information.</p>
            
            {isSuccess ? (
              <div className="bg-primary/10 border border-primary p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                <h4 className="font-display text-xl mb-2">Inquiry Sent</h4>
                <p className="text-sm text-muted-foreground">Jane will be in touch with you shortly regarding this property.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input placeholder="First Name" {...register("firstName")} />
                    {errors.firstName && <span className="text-xs text-destructive">{errors.firstName.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="Last Name" {...register("lastName")} />
                    {errors.lastName && <span className="text-xs text-destructive">{errors.lastName.message}</span>}
                  </div>
                </div>
                <div>
                  <Input placeholder="Email Address" type="email" {...register("email")} />
                  {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
                </div>
                <div>
                  <Input placeholder="Phone Number" type="tel" {...register("phone")} />
                </div>
                <div>
                  <Textarea placeholder="Message" {...register("message")} defaultValue={`I am interested in learning more about ${property.address}.`} />
                  {errors.message && <span className="text-xs text-destructive">{errors.message.message}</span>}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Sending..." : "Request Information"}
                </Button>
              </form>
            )}
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
