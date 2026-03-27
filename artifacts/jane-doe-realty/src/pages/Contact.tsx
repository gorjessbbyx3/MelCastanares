import { useSubmitContact, useGetAgent } from "@workspace/api-client-react";
import { Section, Reveal, Button, Input, Textarea } from "@/components/ui/PremiumComponents";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const contactSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  inquiryType: z.enum(["buying", "selling", "general", "investment", "relocation"]),
  message: z.string().min(10, "Message too short"),
});

export function Contact() {
  const { data: agent } = useGetAgent();
  const { mutate: submitContact, isPending, isSuccess } = useSubmitContact();

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { inquiryType: "general" }
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    submitContact({ data });
  };

  return (
    <div className="pt-24 min-h-screen bg-background">
      <Section>
        <Reveal className="text-center max-w-3xl mx-auto mb-20">
          <h3 className="text-primary text-sm tracking-[0.2em] uppercase mb-4">Connect</h3>
          <h1 className="font-display text-5xl md:text-7xl mb-6">Start the Conversation</h1>
          <p className="text-muted-foreground text-lg">
            Whether you are acquiring a new portfolio asset or selling a cherished estate, Jane is ready to assist with absolute discretion.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          <Reveal direction="right" className="lg:col-span-2 space-y-10">
            <h3 className="font-display text-3xl">Direct Contact</h3>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-card border border-border flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Phone</div>
                  <a href={`tel:${agent?.phone || "+1234567890"}`} className="text-xl hover:text-primary transition-colors">
                    {agent?.phone || "+1 (555) 123-4567"}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-card border border-border flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Email</div>
                  <a href={`mailto:${agent?.email || "jane@example.com"}`} className="text-xl hover:text-primary transition-colors">
                    {agent?.email || "jane.doe@luxuryrealty.com"}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-card border border-border flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Office</div>
                  <div className="text-lg text-foreground">
                    {agent?.brokerage || "Jane Doe Realty"}<br/>
                    <span className="text-muted-foreground text-base">
                      {agent?.brokerageAddress || "100 Luxury Way, Beverly Hills, CA 90210"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="left" className="lg:col-span-3">
            <div className="bg-card border border-border p-8 md:p-12 gold-border-glow">
              {isSuccess ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="font-display text-3xl mb-4">Inquiry Received</h3>
                  <p className="text-muted-foreground text-lg">Thank you for reaching out. Jane or a member of her team will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input placeholder="First Name" {...register("firstName")} />
                      {errors.firstName && <span className="text-xs text-destructive mt-1 block">{errors.firstName.message}</span>}
                    </div>
                    <div>
                      <Input placeholder="Last Name" {...register("lastName")} />
                      {errors.lastName && <span className="text-xs text-destructive mt-1 block">{errors.lastName.message}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input placeholder="Email Address" type="email" {...register("email")} />
                      {errors.email && <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>}
                    </div>
                    <div>
                      <Input placeholder="Phone Number" type="tel" {...register("phone")} />
                    </div>
                  </div>
                  <div>
                    <select 
                      className="w-full bg-input/50 border-b border-border px-4 py-3 text-foreground focus:outline-none focus:border-primary appearance-none rounded-none"
                      {...register("inquiryType")}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="buying">Looking to Buy</option>
                      <option value="selling">Looking to Sell</option>
                      <option value="investment">Investment Opportunities</option>
                      <option value="relocation">Relocation</option>
                    </select>
                  </div>
                  <div>
                    <Textarea placeholder="How can we assist you?" {...register("message")} />
                    {errors.message && <span className="text-xs text-destructive mt-1 block">{errors.message.message}</span>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Submitting..." : "Send Message"}
                  </Button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
