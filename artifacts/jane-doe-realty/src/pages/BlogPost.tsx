import { useParams, Link } from "wouter";
import { useGetBlogPost } from "@workspace/api-client-react";
import { Section, Reveal, Button } from "@/components/ui/PremiumComponents";
import { ArrowLeft, Loader2, Calendar, Clock, User } from "lucide-react";

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useGetBlogPost(slug!);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="font-display text-4xl mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-8">This insight may have been removed.</p>
        <Link href="/blog"><Button>Return to Insights</Button></Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-background pb-24">
      <Section className="pb-8 max-w-4xl mx-auto text-center">
        <Link href="/blog" className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-12">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Insights
        </Link>
        <Reveal>
          <div className="text-primary text-xs font-bold uppercase tracking-widest mb-6">
            {post.category || "Real Estate"}
          </div>
          <h1 className="font-display text-4xl md:text-6xl mb-8 leading-tight">{post.title}</h1>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground uppercase tracking-widest mb-12 border-y border-border py-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {post.readTime || 5} Min Read
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {post.author}
            </div>
          </div>
        </Reveal>
      </Section>

      <div className="px-6 md:px-12 max-w-[1200px] mx-auto mb-16">
        <Reveal>
          <div className="aspect-[21/9] w-full overflow-hidden border border-border">
            <img 
              src={post.coverImage || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80"} 
              alt={post.title} 
              className="w-full h-full object-cover" 
            />
          </div>
        </Reveal>
      </div>

      <Section className="pt-0 max-w-4xl mx-auto">
        <Reveal>
          <div className="prose prose-invert prose-lg prose-headings:font-display prose-headings:font-normal prose-a:text-primary hover:prose-a:text-white prose-p:text-muted-foreground prose-p:leading-relaxed prose-img:border prose-img:border-border max-w-none whitespace-pre-wrap">
            {post.content || post.excerpt}
          </div>
        </Reveal>

        {post.tags && post.tags.length > 0 && (
          <Reveal className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-3">
              {post.tags.map(tag => (
                <span key={tag} className="px-4 py-2 bg-card border border-border text-xs uppercase tracking-widest text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>
        )}
      </Section>
    </div>
  );
}
