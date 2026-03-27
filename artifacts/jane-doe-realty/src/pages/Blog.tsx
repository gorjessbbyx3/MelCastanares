import { useGetBlogPosts } from "@workspace/api-client-react";
import { Section, Reveal, Button } from "@/components/ui/PremiumComponents";
import { Link } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";

export function Blog() {
  const { data, isLoading } = useGetBlogPosts({ limit: 10 });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const featuredPost = data?.posts?.find(p => p.featured) || data?.posts?.[0];
  const regularPosts = data?.posts?.filter(p => p.id !== featuredPost?.id) || [];

  return (
    <div className="pt-24 min-h-screen bg-background pb-24">
      <Section className="pb-12">
        <Reveal>
          <h1 className="font-display text-5xl md:text-7xl mb-6">Market Insights</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mb-16">
            Exclusive perspectives on luxury real estate trends, neighborhood guides, and investment strategies.
          </p>
        </Reveal>

        {featuredPost && (
          <Reveal delay={0.1}>
            <Link href={`/blog/${featuredPost.slug}`} className="group block mb-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-card border border-border p-6 gold-border-glow">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={featuredPost.coverImage || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"} 
                    alt={featuredPost.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                </div>
                <div className="p-8">
                  <div className="text-primary text-xs tracking-widest uppercase mb-4">{featuredPost.category || "Insight"}</div>
                  <h2 className="font-display text-4xl mb-4 group-hover:text-primary transition-colors">{featuredPost.title}</h2>
                  <p className="text-muted-foreground mb-8 line-clamp-3">{featuredPost.excerpt}</p>
                  <div className="flex items-center text-sm font-semibold uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
                    Read Article <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularPosts.map((post, i) => (
            <Reveal key={post.id} delay={0.1 * i} direction="up">
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <div className="bg-card border border-border h-full flex flex-col">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img 
                      src={post.coverImage || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-widest mb-3">
                      <span className="text-primary">{post.category || "Article"}</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-display text-2xl mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">{post.excerpt}</p>
                    <div className="text-xs font-semibold uppercase tracking-widest flex items-center">
                      Read <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
