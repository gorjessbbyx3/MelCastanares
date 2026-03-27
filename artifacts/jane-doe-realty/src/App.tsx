import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Home as HomeIcon, Search, MapPin, Phone, Mail, Menu, X, ChevronDown, ChevronRight,
  ArrowRight, ArrowLeft, Star, Bed, Bath, Square, Calendar, Clock, User,
  TrendingUp, TrendingDown, DollarSign, Building, Heart, Share2,
  CheckCircle, Award, Shield, Compass, BookOpen, FileText, BarChart3,
  Instagram, Facebook, Linkedin, Youtube, Send, Play, Pause, Volume2, VolumeX, MessageCircle
} from "lucide-react";
import * as recharts from "recharts";

const { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = recharts;

// ═══════════════════════════════════════════════
// API CLIENT — all data flows through here
// ═══════════════════════════════════════════════

const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  try {
    const url = API_BASE + path;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
    if (!res.ok) throw new Error('API ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('[API] ' + path + ' failed:', err.message);
    return null;
  }
}

function qs(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
  return q ? '?' + q : '';
}

const api = {
  getAgent:         ()           => apiFetch('/agent'),
  getStats:         ()           => apiFetch('/stats'),
  getProperties:    (params={})  => apiFetch('/properties' + qs(params)),
  getProperty:      (id)         => apiFetch('/properties/' + id),
  getTestimonials:  ()           => apiFetch('/testimonials'),
  getNeighborhoods: ()           => apiFetch('/neighborhoods'),
  getNeighborhood:  (slug)       => apiFetch('/neighborhoods/' + slug),
  getBlogPosts:     (params={})  => apiFetch('/blog' + qs(params)),
  getBlogPost:      (slug)       => apiFetch('/blog/' + slug),
  getMarketData:    (params={})  => apiFetch('/market' + qs(params)),
  getPageContent:   (slug)       => apiFetch('/pages/' + slug),
  submitContact:    (data)       => apiFetch('/contact', { method: 'POST', body: JSON.stringify(data) }),
  submitValuation:  (data)       => apiFetch('/home-valuation', { method: 'POST', body: JSON.stringify(data) }),
};

function useApi(fetcher, fallback, deps = []) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher().then(res => { if (!cancelled && res) setData(res); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, deps);
  return { data, loading };
}

// ─────────────────────────────────────────────
// DESIGN SYSTEM — hand-crafted, no templates
// ─────────────────────────────────────────────

const BRAND = {
  gold: "#D4A853",
  goldLight: "#F0D68A",
  goldDark: "#9B7B2F",
  teal: "#1A8A7D",
  tealLight: "#2BB5A5",
  tealDark: "#0F5C53",
  coral: "#E8866A",
  bg: "#FDFAF5",
  bgLight: "#FFF9F0",
  bgCard: "#FFFFFF",
  bgElevated: "#F7F3EC",
  bgDark: "#1B2A33",
  text: "#1B2A33",
  textMuted: "#5A6B72",
  textDim: "#8A9BA3",
  border: "#E8DFD2",
  borderLight: "#F0EAE0",
};

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────

// Fallback data when API is unreachable
const FALLBACK_AGENT = {
  name: "Mel Castanares",
  title: "REALTOR® | Dream Home Realty Hawai'i",
  license: "RS-84753",
  phone: "(808) 285-8774",
  email: "mel@homesweethomehawaii.com",
  instagram: "https://www.instagram.com/mel.castanares",
  instagramHandle: "@mel.castanares",
  brokerage: "Dream Home Realty Hawaii LLC",
  brokerageAddress: "95-1249 Meheula Parkway, #B-15B\nMililani, HI 96789",
  address: "95-1249 Meheula Parkway, #B-15B\nMililani, HI 96789",
  bio: "Born and raised on O'ahu, Mel is a mama, a REALTOR®, and your honest guide to Hawaii real estate. Before earning her license (RS-84753), she spent years managing properties across Honolulu — giving her a practical, investor-level view of what makes a home truly livable, not just marketable.\n\nAs a mom herself, Mel gets it: buying a home isn't just a financial decision, it's a life decision. She takes the time to understand your family's needs — the school zone, the commute, the backyard big enough for the kids — and won't push you into something that doesn't fit. Whether you're a first-time buyer navigating Mililani, an investor eyeing a Kāne'ohe rental, or relocating from the mainland, Mel makes the process feel personal, transparent, and — yes — actually fun.\n\nAt Dream Home Realty Hawai'i, she specializes in Central and West O'ahu: Mililani, Waipahu, Pearl City, Kapolei, and Ewa Beach — neighborhoods she knows like the back of her hand.",
  shortBio: "O'ahu-born mama REALTOR® · Honest guidance · Local expertise.",
  photo: "/images/mel-headshot.jpg",
  photoUrl: "/images/mel-headshot.jpg",
  specialties: ["First-Time Buyers", "Residential Sales", "Property Management", "Investment Properties", "Relocation Services"],
  serviceAreas: ["Mililani", "Waipahu", "Kāne'ohe", "Honolulu", "Kapolei", "Ewa Beach", "Pearl City"],
  areas: ["Mililani", "Waipahu", "Kāne'ohe", "Honolulu", "Kapolei", "Ewa Beach", "Pearl City"],
  yearsExperience: 8,
  facebook: "https://www.facebook.com/dreamhomehi",
  linkedin: "#",
  stats: { years: 8, sold: 120, volume: "$75M+", satisfaction: "100%" },
};

const FALLBACK_PROPERTIES = [
  { id: "rent-1", title: "Lulani Ocean Duplex", address: "Kahalu'u, Lulani Ocean Area", city: "Kāne'ohe", state: "HI", zip: "96744", price: 2550, bedrooms: 1, bathrooms: 1, sqft: 650, status: "active", type: "rental", featured: true, images: [{url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", isPrimary: true}], description: "Charming 1-bedroom, 1-bath attached duplex in the quiet Lulani Ocean area. Ground-level unit with ceramic and vinyl flooring, split AC, dishwasher, solar water heater, in-unit laundry, assigned parking, and private yard access. Rent includes pest control, internet, trash, and yard maintenance. Peaceful residential neighborhood close to Kāne'ohe town and Windward beaches.", amenities: ["Split AC", "In-Unit Laundry", "Private Yard", "Assigned Parking", "Internet Included"], priceLabel: "/mo" },
  { id: "rent-2", title: "Kukui Plaza Downtown", address: "Kukui Plaza, Downtown", city: "Honolulu", state: "HI", zip: "96817", price: 1900, bedrooms: 1, bathrooms: 1, sqft: 580, status: "active", type: "rental", featured: true, images: [{url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", isPrimary: true}], description: "Downtown living at its finest — Kukui Plaza offers comfort, security, and unparalleled convenience. 1 bedroom, 1 bathroom with covered parking. Walking distance to dining, shops, and entertainment. Amenities include swimming pool, BBQ grills, picnic area, and landscaped gardens.", amenities: ["Covered Parking", "Pool", "BBQ Area", "Landscaped Gardens", "Downtown Location"], priceLabel: "/mo" },
  { id: "sale-1", title: "Wahiawa Heights Corner Lot", address: "Marigold Acres, Wahiawa Heights", city: "Wahiawa", state: "HI", zip: "96786", price: 350000, bedrooms: 0, bathrooms: 0, sqft: 8459, status: "active", type: "land", featured: true, images: [{url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", isPrimary: true}], description: "Design opportunity for visionaries! Corner lot spanning 8,459 sq ft in the beloved Marigold Acres neighborhood. R-7.5 zoning with level topography — perfect for a custom new build, multigenerational residence, or modern duplex with ADU potential. The true value lies in the land and its desirable corner-lot location.", amenities: ["Corner Lot", "R-7.5 Zoning", "ADU Potential", "Level Topography", "8,459 Sq Ft Lot"] },
  { id: "sale-2", title: "Pearl 2 Condo — Fully Renovated", address: "Pearl 2 Condo", city: "Aiea", state: "HI", zip: "96701", price: 420000, bedrooms: 2, bathrooms: 1, sqft: 800, status: "active", type: "condo", featured: false, images: [{url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", isPrimary: true}], description: "Fully renovated 2-bedroom, 1-bathroom condo in beautiful Aiea. Fresh paint, luxury vinyl plank flooring throughout, stainless steel appliances, and window AC. Modern and sophisticated — move-in ready.", amenities: ["Renovated", "Luxury Vinyl Plank", "Stainless Appliances", "Window AC"] },
  { id: "sale-3", title: "Mililani Family Home", address: "Mililani Town", city: "Mililani", state: "HI", zip: "96789", price: 875000, bedrooms: 3, bathrooms: 2, sqft: 1450, status: "active", type: "single_family", featured: false, images: [{url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", isPrimary: true}], description: "Family-friendly Mililani Town home with 3 bedrooms and 2 bathrooms. Great schools, community parks, and easy freeway access. Well-maintained with a private backyard perfect for entertaining.", amenities: ["Private Backyard", "Top Schools", "Community Parks", "Near Freeway"] },
  { id: "sale-4", title: "Kapolei Townhome", address: "Kapolei", city: "Kapolei", state: "HI", zip: "96707", price: 650000, bedrooms: 3, bathrooms: 2, sqft: 1200, status: "pending", type: "townhouse", featured: false, images: [{url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", isPrimary: true}], description: "Modern townhome in growing Kapolei. Open floor plan, two-car garage, and lanai. Close to shopping, restaurants, and the new rail transit. Perfect for families or investors.", amenities: ["Two-Car Garage", "Lanai", "Near Rail Transit", "Open Floor Plan"] },
];

const FALLBACK_NEIGHBORHOODS = [
  { id: "mililani", name: "Mililani", tagline: "Mel's home turf · Best schools on O'ahu", description: "Central O'ahu's crown jewel — Mililani is a master-planned community built for families. Top-ranked schools (Mililani High, Mililani Uka Elementary), 23 parks, 7 recreation centers, and HOA-maintained common areas make it one of the most livable communities in the state. Easy H-2 freeway access puts downtown Honolulu 30 minutes away. Mel grew up in Central O'ahu and knows every street, school district, and neighborhood park here. Median prices range from $600K (townhomes) to $900K+ (single-family). A perennial seller's market due to limited inventory and strong demand from families.", images: [{url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", isPrimary: true}], medianHomePrice: "$820K", growth: "+4.8%", highlights: ["Top-Rated Schools", "23 Parks", "Family-Friendly", "Master-Planned"] },
  { id: "ewa-beach", name: "Ewa Beach / Kapolei", tagline: "O'ahu's fastest-growing 'second city'", description: "The west side is booming — and for good reason. Newer construction, more space per dollar, and a rapidly expanding infrastructure (restaurants, Target, Costco, soon the rail) make Ewa Beach and Kapolei the best value on island right now. Single-family homes from $700K–$1.1M. Great schools, beach parks, and a strong sense of community. Mel has helped dozens of families make the move west and knows which streets, builders, and HOAs are worth your time. This is where savvy buyers are investing right now.", images: [{url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", isPrimary: true}], medianHomePrice: "$780K", growth: "+6.2%", highlights: ["New Construction", "Rail Access", "Great Value", "Growing Infrastructure"] },
  { id: "pearl-city", name: "Pearl City / Aiea", tagline: "Central location, unbeatable convenience", description: "Sitting at the geographic center of O'ahu, Pearl City and Aiea offer the perfect balance of affordability and access. Quick freeway on-ramps to every part of the island, the Pearl Highlands shopping center, and strong public schools. Condos from $350K–$600K; single-family from $750K+. Great for first-time buyers who want more home for their money without sacrificing convenience. Mel specializes in this corridor and has extensive knowledge of the condo market here.", images: [{url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", isPrimary: true}], medianHomePrice: "$620K", growth: "+3.9%", highlights: ["Central Location", "Freeway Access", "First-Time Buyers", "Condo Value"] },
  { id: "kaneohe", name: "Kāne'ohe", tagline: "Peaceful windward living", description: "Known for cooler weather and peaceful neighborhoods on the windward side. Sandbar adventures, botanical gardens, and breathtaking mountain ridges. Mel has helped multiple families find rental investments and primary homes in this community. Local tips: the Kāne'ohe sandbar is life-changing, and the morning drive over the Pali is one of the most scenic in the world.", images: [{url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80", isPrimary: true}], medianHomePrice: "$890K", growth: "+3.5%", highlights: ["Cooler Climate", "Windward Side", "Mountain Views", "Rental Potential"] },
  { id: "kailua", name: "Kailua", tagline: "World-class beaches · Charming town", description: "Home to consistently ranked world-class beaches (Kailua Beach, Lanikai). A family-friendly town with excellent schools, charming boutiques, and an active outdoor lifestyle. High demand keeps prices strong. Great for buyers who want island living without the urban hustle — and for investors, short-term rental potential is significant.", images: [{url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", isPrimary: true}], medianHomePrice: "$1.4M", growth: "+6.1%", highlights: ["World-Class Beaches", "Top Schools", "Investment Potential", "Beach Lifestyle"] },
  { id: "kaimuki", name: "Kaimuki", tagline: "Local food scene · Walkable streets", description: "Known for its eclectic local character and unbeatable food scene. Walkable streets lined with boutique shops, craft coffee, and some of Honolulu's best restaurants (12th Ave Grill, Mud Hen Water, Koko Head Cafe). Strong appreciation history. A great option for buyers wanting urban walkability with neighborhood character.", images: [{url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", isPrimary: true}], medianHomePrice: "$985K", growth: "+4.2%", highlights: ["Best Food Scene", "Walkable", "Local Character", "Strong Appreciation"] },
  { id: "hawaii-kai", name: "Hawai'i Kai", tagline: "Marina & waterfront living", description: "Known for the Hawaii Kai Marina, easy ocean access and waterfront living. A master-planned community with golf, hiking (Koko Head!), and water sports. Mel's bold prediction for 2026: Hawai'i Kai is the most undervalued neighborhood on O'ahu right now. New marina renovations, school improvements, and strong community investment are converging.", images: [{url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80", isPrimary: true}], medianHomePrice: "$1.3M", growth: "+4.7%", highlights: ["Marina Access", "Koko Head", "Waterfront", "Undervalued Gem"] },
  { id: "north-shore", name: "North Shore", tagline: "Surf culture · Farm-to-table living", description: "Known for its legendary surf culture and laidback lifestyle. World-famous waves in winter, calm snorkeling in summer, and farm-to-table dining year-round (Giovanni's Shrimp Truck is obligatory). Low inventory keeps prices competitive. Great for buyers seeking a completely different pace of island life.", images: [{url: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800&q=80", isPrimary: true}], medianHomePrice: "$1.1M", growth: "+5.3%", highlights: ["Surf Culture", "Farm-to-Table", "Low Inventory", "Unique Lifestyle"] },
];

const FALLBACK_TESTIMONIALS = [
  { clientName: "First-Time Renter", quote: "This was the first time renting a house on my own so I was really skeptical on which company to go with. I put my trust in Tori and Mel and they made the entire process smooth and easy. Although it was my first-time renting, they made me feel safe and explained everything I needed to know. Anytime I've had a problem or concern they were able to get back to me right away! In the future I will put my trust back with them as I make my first home purchase!", rating: 5, transactionType: "bought", featured: true, clientPhoto: "/images/testimonial-sold.jpg" },
  { clientName: "George C.", quote: "Mel guided us through selling our home on Wilhelmina Rise with extraordinary professionalism. After an extensive interview process, she stood out for her market knowledge and genuine care.", rating: 5, transactionType: "sold" },
  { clientName: "Jenely S.", quote: "I searched for nearly 3 years, unsure if I even wanted to buy. Mel stayed patient the entire time and ultimately helped me find my perfect home. She's honestly amazing.", rating: 5, transactionType: "bought" },
  { clientName: "Dan W.", quote: "As a first-time buyer, I had no idea what I was getting into. Mel assembled an incredible team and walked me through every step. I couldn't have done it without her.", rating: 5, transactionType: "bought" },
  { clientName: "Claire K.", quote: "Mel definitely exceeded our expectations! She went above and beyond coordinating our purchase remotely. Everything went smoothly even though we were navigating from the mainland.", rating: 5, transactionType: "bought" },
  { clientName: "Lisa H.", quote: "We had been on the market 300+ days with another agent. Mel stepped in, redid everything from photos to staging, and had us under contract within weeks.", rating: 5, transactionType: "sold" },
  { clientName: "Nick Z.", quote: "Purchased a condo with Mel and she was great from start to finish. Very communicative and I'll be returning for any future Oahu real estate needs!", rating: 5, transactionType: "bought" },
];

const FALLBACK_BLOG_POSTS = [
  { id: "1", slug: "why-oahu-buyers-are-winning-right-now", title: "Why O'ahu Buyers Are Winning Right Now (And Sellers Should Pay Attention)", excerpt: "For the first time in three years, buyers have real negotiating power on O'ahu. Inventory is up 22%, price reductions are climbing, and mortgage rate locks are getting creative. Here's how smart buyers are capitalizing — and what sellers need to do differently.", category: "Market Intelligence", date: "Mar 22, 2026", readTime: 7, images: [{url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", isPrimary: true}], featured: true },
  { id: "2", slug: "i-toured-50-open-houses-so-you-dont-have-to", title: "I Toured 50 Open Houses in 30 Days — Here's What Actually Sells", excerpt: "After walking through 50 properties across every neighborhood on O'ahu, patterns emerged. The homes that went under contract fast all shared 5 specific things. Spoiler: granite countertops aren't one of them.", category: "Behind The Scenes", date: "Mar 14, 2026", readTime: 9, images: [{url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", isPrimary: true}] },
  { id: "3", slug: "the-hidden-cost-of-waiting-to-sell", title: "The Hidden Cost of 'Waiting for the Right Time' to Sell Your Home", excerpt: "Every month you wait to list, you're not just losing potential equity — you're competing against an increasingly savvy buyer pool armed with better data than ever. I break down the real math behind the 'I'll wait' decision.", category: "Seller Reality Check", date: "Mar 5, 2026", readTime: 6, images: [{url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", isPrimary: true}] },
  { id: "4", slug: "kaimuki-vs-kailua-the-real-comparison", title: "Kaimuki vs. Kailua: The Honest Comparison Nobody Else Will Give You", excerpt: "Two of O'ahu's most beloved neighborhoods, but wildly different lifestyles. I've sold homes in both for years. Here's the unfiltered truth about schools, commutes, appreciation rates, and which one actually fits your life.", category: "Neighborhood Deep Dive", date: "Feb 24, 2026", readTime: 11, images: [{url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", isPrimary: true}] },
  { id: "5", slug: "what-mainland-buyers-get-wrong-about-hawaii", title: "What Mainland Buyers Get Wrong About Buying in Hawai'i", excerpt: "After helping 60+ families relocate to the islands, I've seen the same mistakes repeated. From underestimating hurricane insurance to not understanding leasehold vs. fee simple, these are the traps — and how to avoid them.", category: "Relocation Intel", date: "Feb 15, 2026", readTime: 8, images: [{url: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800&q=80", isPrimary: true}] },
  { id: "6", slug: "my-2026-prediction-for-hawaii-kai", title: "My Bold 2026 Prediction for Hawai'i Kai (And the Data Behind It)", excerpt: "I'm going on record: Hawai'i Kai is the most undervalued neighborhood on O'ahu right now. New marina renovations, school improvements, and the Costco effect are converging. Here's my full analysis.", category: "Investment Thesis", date: "Feb 6, 2026", readTime: 10, images: [{url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80", isPrimary: true}] },
];

const FALLBACK_MARKET_DATA = [
  { month: "Sep", median: 985, inventory: 1420, daysOnMarket: 28 },
  { month: "Oct", median: 1010, inventory: 1380, daysOnMarket: 26 },
  { month: "Nov", median: 998, inventory: 1340, daysOnMarket: 27 },
  { month: "Dec", median: 1025, inventory: 1290, daysOnMarket: 25 },
  { month: "Jan", median: 1040, inventory: 1310, daysOnMarket: 24 },
  { month: "Feb", median: 1055, inventory: 1350, daysOnMarket: 23 },
  { month: "Mar", median: 1068, inventory: 1400, daysOnMarket: 22 },
];

// ─────────────────────────────────────────────
// CUSTOM HOOKS
// ─────────────────────────────────────────────

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return y;
}

// ─────────────────────────────────────────────
// REVEAL WRAPPER
// ─────────────────────────────────────────────

function Reveal({ children, delay = 0, direction = "up", className = "" }) {
  const [ref, visible] = useScrollReveal();
  const dirs = { up: "translate-y-12", down: "-translate-y-12", left: "translate-x-12", right: "-translate-x-12", none: "" };
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translate(0,0)" : undefined,
      transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      ...(visible ? {} : { transform: dirs[direction]?.includes("y-12") ? "translateY(48px)" : dirs[direction]?.includes("x-12") ? (direction === "left" ? "translateX(48px)" : "translateX(-48px)") : undefined })
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────

function Counter({ end, suffix = "", prefix = "", duration = 2000 }) {
  const [ref, visible] = useScrollReveal();
  const numEnd = typeof end === "number" ? end : parseInt(end as string);
  const [count, setCount] = useState(isNaN(numEnd) ? 0 : numEnd);
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!visible || hasAnimated) return;
    setHasAnimated(true);
    if (isNaN(numEnd)) return;
    let start = 0;
    setCount(0);
    const step = Math.ceil(numEnd / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= numEnd) { setCount(numEnd); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, numEnd, duration, hasAnimated]);
  return <span ref={ref}>{prefix}{isNaN(numEnd) ? end : count}{suffix}</span>;
}

// ─────────────────────────────────────────────
// STYLES (injected via style tag)
// ─────────────────────────────────────────────

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root, #__next { background: ${BRAND.bg} !important; color: ${BRAND.text} !important; }
    html { scroll-behavior: smooth; }
    body { font-family: 'DM Sans', sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: ${BRAND.teal}33; color: ${BRAND.teal}; }
    
    .font-display { font-family: 'DM Serif Display', serif; }
    .font-body { font-family: 'DM Sans', sans-serif; }
    
    .gold-text { color: ${BRAND.teal}; }
    .gold-gradient { background: linear-gradient(135deg, ${BRAND.goldDark}, ${BRAND.gold}, ${BRAND.goldLight}, ${BRAND.gold}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    
    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(26,138,125,0.06), transparent); animation: shimmer 3s infinite; }
    @keyframes shimmer { 100% { left: 100%; } }
    
    .line-reveal { display: inline-block; }
    .line-reveal span { display: inline-block; animation: lineUp 0.8s ease forwards; opacity: 0; }
    @keyframes lineUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
    
    .float { animation: float 6s ease-in-out infinite; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    
    .pulse-ring { position: relative; }
    .pulse-ring::before { content: ''; position: absolute; inset: -4px; border: 1px solid ${BRAND.gold}44; border-radius: inherit; animation: pulseRing 2.5s ease-in-out infinite; }
    @keyframes pulseRing { 0%,100% { opacity: 0; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
    
    .grain { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }
    
    .nav-link { position: relative; }
    .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px; background: ${BRAND.teal}; transition: width 0.4s cubic-bezier(0.22,1,0.36,1); }
    .nav-link:hover::after, .nav-link.active::after { width: 100%; }
    
    .card-hover { transition: all 0.5s cubic-bezier(0.22,1,0.36,1); }
    .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${BRAND.gold}22; }
    
    .img-zoom { overflow: hidden; }
    .img-zoom img { transition: transform 1.2s cubic-bezier(0.22,1,0.36,1); }
    .img-zoom:hover img { transform: scale(1.08); }
    
    .input-custom { width: 100%; background: ${BRAND.bgCard}; border: none; border-bottom: 1px solid ${BRAND.border}; padding: 14px 16px; color: ${BRAND.text}; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.3s; }
    .input-custom:focus { border-bottom-color: ${BRAND.gold}; }
    .input-custom::placeholder { color: ${BRAND.textDim}; }
    select.input-custom option { background: ${BRAND.bgCard}; color: ${BRAND.text}; }
    
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 14px 32px; background: ${BRAND.teal}; color: #FFFFFF; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; border: none; cursor: pointer; transition: all 0.4s cubic-bezier(0.22,1,0.36,1); position: relative; overflow: hidden; }
    .btn-primary:hover { background: ${BRAND.tealLight}; transform: translateY(-2px); box-shadow: 0 8px 30px ${BRAND.teal}33; }
    .btn-primary::after { content: ''; position: absolute; top: 50%; left: 50%; width: 0; height: 0; background: rgba(255,255,255,0.15); border-radius: 50%; transform: translate(-50%,-50%); transition: width 0.6s, height 0.6s; }
    .btn-primary:active::after { width: 300px; height: 300px; }
    
    .btn-outline { display: inline-flex; align-items: center; justify-content: center; padding: 14px 32px; background: transparent; color: ${BRAND.teal}; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; border: 1px solid ${BRAND.teal}55; cursor: pointer; transition: all 0.4s; }
    .btn-outline:hover { background: ${BRAND.teal}11; border-color: ${BRAND.teal}; }
    
    .section-pad { padding: 100px 24px; max-width: 1400px; margin: 0 auto; }
    @media(min-width:768px) { .section-pad { padding: 120px 48px; } }
    @media(min-width:1024px) { .section-pad { padding: 140px 64px; } }
    
    .tracking-mega { letter-spacing: 0.25em; }
    .tracking-wide2 { letter-spacing: 0.15em; }
    
    .border-gold { border-color: ${BRAND.gold}22; }
    .border-subtle { border-color: ${BRAND.border}; }
    
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes dash { to { stroke-dashoffset: 0; } }
    @keyframes waveFloat { 0%,100% { transform: translateX(0) translateY(0); } 25% { transform: translateX(10px) translateY(-5px); } 50% { transform: translateX(0) translateY(-10px); } 75% { transform: translateX(-10px) translateY(-5px); } }
    
    .hero-text-anim { animation: fadeInUp 1.2s cubic-bezier(0.22,1,0.36,1) forwards; opacity: 0; }
    .hero-text-anim-d1 { animation-delay: 0.2s; }
    .hero-text-anim-d2 { animation-delay: 0.5s; }
    .hero-text-anim-d3 { animation-delay: 0.8s; }
    .hero-text-anim-d4 { animation-delay: 1.1s; }
  `}</style>
);

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────

function Nav({ page, setPage }) {
  const scrollY = useScrollY();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdown, setDropdown] = useState(null);
  const isScrolled = scrollY > 60;

  const navItems = [
    { label: "Home", page: "home" },
    { label: "Portfolio", page: "properties" },
    {
      label: "Your Experience", children: [
        { label: "Buyer's Experience", page: "buyers" },
        { label: "Seller's Experience", page: "sellers" },
        { label: "Mortgage Calculator", page: "mortgage" },
        { label: "Relocation Guide", page: "relocation" },
      ]
    },
    { label: "Neighborhoods", page: "neighborhoods" },
    { label: "Market", page: "market" },
    { label: "News", page: "blog" },
    { label: "About", page: "about" },
  ];

  const go = (p) => { setPage(p); setMobileOpen(false); setDropdown(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: isScrolled ? `${BRAND.bg}F5` : "transparent",
        backdropFilter: isScrolled ? "blur(20px)" : "none",
        borderBottom: isScrolled ? `1px solid ${BRAND.border}` : "1px solid transparent",
        transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
        padding: isScrolled ? "12px 0" : "20px 0",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => go("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, border: `1px solid ${BRAND.gold}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
              <span style={{ transform: "rotate(-45deg)", fontFamily: "'DM Serif Display', serif", fontSize: 16, color: BRAND.teal, fontWeight: 600 }}>M</span>
            </div>
            <span className="font-display" style={{ fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.text }}>Mel Castanares</span>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="hidden-mobile">
            <a href="tel:8082858774" style={{
              display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
              color: BRAND.textMuted, fontSize: 11, letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif",
              transition: "color 0.3s",
            }} onMouseEnter={e => (e.currentTarget.style.color = BRAND.teal)} onMouseLeave={e => (e.currentTarget.style.color = BRAND.textMuted)}>
              <Phone size={12} color={BRAND.teal} /> (808) 285-8774
            </a>
            <div style={{ width: 1, height: 16, background: BRAND.border }} />
            {navItems.map((item, i) => item.children ? (
              <div key={i} style={{ position: "relative" }} onMouseEnter={() => setDropdown(i)} onMouseLeave={() => setDropdown(null)}>
                <button className="nav-link" style={{
                  background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer",
                  fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
                }}>
                  {item.label} <ChevronDown size={12} style={{ transition: "transform 0.3s", transform: dropdown === i ? "rotate(180deg)" : "" }} />
                </button>
                {dropdown === i && (
                  <div style={{
                    position: "absolute", top: "100%", left: -16, marginTop: 12,
                    background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "8px 0", minWidth: 220,
                    animation: "fadeInUp 0.3s ease forwards",
                  }}>
                    {item.children.map((child, j) => (
                      <button key={j} onClick={() => go(child.page)} style={{
                        display: "block", width: "100%", textAlign: "left", padding: "10px 20px",
                        background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer",
                        fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.3s",
                      }} onMouseEnter={e => { e.target.style.color = BRAND.gold; e.target.style.background = `${BRAND.gold}08`; }}
                        onMouseLeave={e => { e.target.style.color = BRAND.textMuted; e.target.style.background = "none"; }}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button key={i} className={`nav-link ${page === item.page ? "active" : ""}`} onClick={() => go(item.page)} style={{
                background: "none", border: "none", color: page === item.page ? BRAND.gold : BRAND.textMuted, cursor: "pointer",
                fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, padding: "4px 0",
                transition: "color 0.3s",
              }}>
                {item.label}
              </button>
            ))}
            <button className="btn-primary" onClick={() => go("contact")} style={{ padding: "10px 24px", fontSize: 11 }}>Let's Connect</button>
          </nav>

          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: BRAND.text, cursor: "pointer", display: "none" }} className="show-mobile">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, background: BRAND.bg,
          display: "flex", flexDirection: "column", animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ padding: 24, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: BRAND.text, cursor: "pointer" }}><X size={28} /></button>
          </div>
          <nav style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
            {navItems.map((item, i) => item.children ? (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>{item.label}</div>
                {item.children.map((c, j) => (
                  <button key={j} onClick={() => go(c.page)} style={{
                    display: "block", background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'DM Serif Display', serif", fontSize: 22, color: BRAND.text, margin: "8px auto",
                    animation: `fadeInUp 0.5s ease ${0.1 * (i + j)}s forwards`, opacity: 0,
                  }}>{c.label}</button>
                ))}
              </div>
            ) : (
              <button key={i} onClick={() => go(item.page)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'DM Serif Display', serif", fontSize: 28, color: page === item.page ? BRAND.gold : BRAND.text,
                animation: `fadeInUp 0.5s ease ${0.1 * i}s forwards`, opacity: 0,
              }}>{item.label}</button>
            ))}
            <button className="btn-primary" onClick={() => go("contact")} style={{ marginTop: 16, animation: `fadeInUp 0.5s ease 0.8s forwards`, opacity: 0 }}>Let's Connect</button>
          </nav>
        </div>
      )}

      <style>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media(max-width:1024px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────

function HomePage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const scrollY = useScrollY();
  
  // API calls with fallback data
  const { data: agent } = useApi(() => api.getAgent(), FALLBACK_AGENT);
  const { data: stats } = useApi(() => api.getStats(), { homesSold: 120, totalSalesVolume: 75000000, yearsExperience: 8, clientSatisfactionRate: 100 });
  const { data: propsResp } = useApi(() => api.getProperties({ featured: true, limit: 3 }), { properties: FALLBACK_PROPERTIES.filter(p => p.featured) });
  const { data: testiResp } = useApi(() => api.getTestimonials(), { testimonials: FALLBACK_TESTIMONIALS });
  const { data: nResp } = useApi(() => api.getNeighborhoods(), { neighborhoods: FALLBACK_NEIGHBORHOODS });

  return (
    <div>
      {/* HERO — cinematic parallax */}
      <section style={{ position: "relative", height: "100vh", minHeight: 700, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          transform: `translateY(${scrollY * 0.15}px)`,
        }}>
          <img 
            src="/images/hero-diamondhead.jpg" 
            alt="Diamond Head infinity pool overlooking the ocean" 
            style={{ width: "100%", height: "120%", objectFit: "cover", objectPosition: "center 35%" }}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(27,42,51,0.3) 0%, rgba(27,42,51,0.5) 50%, ${BRAND.bg}F0 100%)` }} />
        
        {/* Decorative wave lines */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1, opacity: 0.06 }} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,100 C360,180 720,20 1440,100 L1440,200 L0,200 Z" fill={BRAND.teal} style={{ animation: "waveFloat 8s ease-in-out infinite" }} />
        </svg>

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px", maxWidth: 900, marginTop: 40 }}>
          <div className="hero-text-anim hero-text-anim-d1" style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 24, fontWeight: 500 }}>
            O'ahu Real Estate
          </div>
          <h1 className="font-display hero-text-anim hero-text-anim-d2" style={{ fontSize: "clamp(40px, 7vw, 80px)", lineHeight: 1.05, marginBottom: 24 }}>
            Welcome Home to{" "}
            <span className="gold-gradient" style={{ fontStyle: "italic" }}>Paradise</span>
          </h1>
          <p className="hero-text-anim hero-text-anim-d3" style={{ color: BRAND.textMuted, fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 40px", fontWeight: 300 }}>
            Your dream home in Hawai'i starts with the right guide. Let's find it together — Mel Castanares.
          </p>
          <div className="hero-text-anim hero-text-anim-d4" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => go("properties")}>
              <Search size={14} style={{ marginRight: 8 }} /> Start Your Search
            </button>
            <button className="btn-outline" onClick={() => go("valuation")}>Home Valuation</button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          opacity: scrollY > 100 ? 0 : 1, transition: "opacity 0.5s",
        }}>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.textDim }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${BRAND.gold}, transparent)`, animation: "float 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* QUICK LINKS — 3 cards */}
      <section className="section-pad" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            { icon: <Search size={24} />, title: "Home Search", desc: "Browse all active listings on O'ahu", page: "properties" },
            { icon: <DollarSign size={24} />, title: "Home Valuation", desc: "Find out what your home is worth", page: "valuation" },
            { icon: <Calendar size={24} />, title: "Mortgage Calculator", desc: "Estimate your monthly payment instantly", page: "mortgage" },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <div className="card-hover shimmer" onClick={() => go(item.page)} style={{
                cursor: "pointer", padding: 40, background: BRAND.bgCard,
                border: `1px solid ${BRAND.border}`, position: "relative",
              }}>
                <div style={{ color: BRAND.teal, marginBottom: 20 }}>{item.icon}</div>
                <h3 className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{item.desc}</p>
                <span style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  Explore <ArrowRight size={14} />
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MEET JANE — split layout */}
      <section style={{ background: BRAND.bgLight, borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}` }}>
        <div className="section-pad">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 64, alignItems: "center" }}>
            <Reveal direction="right">
              <div className="img-zoom" style={{ position: "relative" }}>
                <img src={agent.photoUrl || agent.photo || agent.photoUrl || FALLBACK_AGENT.photo} alt="Mel" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", bottom: -20, right: -20, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "20px 28px",
                }}>
                  <div className="font-display gold-text" style={{ fontSize: 36 }}><Counter end={agent.yearsExperience || 8} suffix="+" /></div>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.textMuted }}>Years Experience</div>
                </div>
              </div>
            </Reveal>
            <Reveal direction="left" delay={0.2}>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 16, fontWeight: 500 }}>About</div>
              <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.15, marginBottom: 24 }}>
                Meet <span style={{ fontStyle: "italic" }} className="gold-text">Mel</span>
              </h2>
              <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                {(agent.bio || agent.shortBio || FALLBACK_AGENT.bio || "").split("\n")[0]}
              </p>
              <button className="btn-outline" onClick={() => go("about")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Learn More <ArrowRight size={14} />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: BRAND.bg, borderBottom: `1px solid ${BRAND.border}` }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { val: stats.yearsExperience || 8, suffix: "+", label: "Years Experience" },
            { val: stats.homesSold || 120, suffix: "+", label: "Homes Sold" },
            { val: stats.totalSalesVolume ? "$" + Math.round(stats.totalSalesVolume/1000000) + "M+" : "$75M+", suffix: "", label: "Sales Volume", isText: true },
            { val: stats.clientSatisfactionRate || 100, suffix: "%", label: "Client Satisfaction" },
            { val: "RS-84753", suffix: "", label: "License #", isText: true },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="font-display gold-text" style={{ fontSize: s.isText && (s.val as string).length > 6 ? 28 : 40, marginBottom: 4 }}>
                {s.isText ? s.val : <Counter end={s.val as number} suffix={s.suffix} />}
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.textMuted }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="section-pad">
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Curated Collection</div>
              <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>Featured Properties</h2>
            </div>
            <button className="btn-outline" onClick={() => go("properties")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              View All <ArrowRight size={14} />
            </button>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {(propsResp?.properties || []).filter(p => p.featured).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.15} direction="up">
              <PropertyCard property={p} onClick={() => { setPage("property-detail"); window.__selectedProperty = p; window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* NEIGHBORHOODS */}
      <section style={{ background: BRAND.bgLight, borderTop: `1px solid ${BRAND.border}` }}>
        <div className="section-pad">
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Explore O'ahu</div>
              <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>Neighborhoods</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {(nResp?.neighborhoods || FALLBACK_NEIGHBORHOODS).slice(0, 4).map((n, i) => (
              <Reveal key={n.id} delay={i * 0.1}>
                <div className="card-hover img-zoom" onClick={() => go("neighborhoods")} style={{ cursor: "pointer", position: "relative", overflow: "hidden", aspectRatio: "4/3" }}>
                  <img src={n.coverImage || n.images?.[0]?.url || n.img} alt={n.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, padding: 24 }}>
                    <h3 className="font-display" style={{ fontSize: 26, marginBottom: 4 }}>{n.name}</h3>
                    <p style={{ color: BRAND.textMuted, fontSize: 13 }}>{n.tagline}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button className="btn-outline" onClick={() => go("neighborhoods")}>View All Neighborhoods</button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section-pad" style={{ overflow: "hidden" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Client Success</div>
            <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>Words of Praise</h2>
          </div>
        </Reveal>
        <TestimonialCarousel testimonials={testiResp?.testimonials || FALLBACK_TESTIMONIALS} />
      </section>

      {/* NEWSLETTER */}
      <section style={{ background: BRAND.bgCard, borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}` }}>
        <div className="section-pad" style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
          <Reveal>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Stay Informed</div>
            <h2 className="font-display" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", marginBottom: 16 }}>Monthly Market Updates</h2>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
              Exclusive insights on O'ahu's real estate market delivered to your inbox.
            </p>
            <div style={{ display: "flex", gap: 0, maxWidth: 500, margin: "0 auto" }}>
              <input className="input-custom" placeholder="Your email address" style={{ flex: 1 }} />
              <button className="btn-primary" style={{ whiteSpace: "nowrap" }}>
                <Send size={14} style={{ marginRight: 6 }} /> Subscribe
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad" style={{ textAlign: "center" }}>
        <Reveal>
          <h2 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.15, marginBottom: 20 }}>
            Ready to Find Your<br /><span className="gold-gradient" style={{ fontStyle: "italic" }}>Dream Home?</span>
          </h2>
          <p style={{ color: BRAND.textMuted, fontSize: 16, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Whether buying, selling, or investing — Mel is ready to guide you every step of the way.
          </p>
          <button className="btn-primary" onClick={() => go("contact")} style={{ padding: "16px 40px" }}>Let's Connect</button>
        </Reveal>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// TESTIMONIAL CAROUSEL
// ─────────────────────────────────────────────

function TestimonialCarousel({ testimonials = [] }) {
  const [idx, setIdx] = useState(0);
  if (!testimonials.length) return null;
  const t = testimonials[idx] || {};
  useEffect(() => { const timer = setInterval(() => setIdx(i => (i + 1) % testimonials.length), 6000); return () => clearInterval(timer); }, [testimonials.length]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", minHeight: 300 }}>
      <div key={idx} style={{ animation: "fadeIn 0.6s ease" }}>
        {/* Client photo if available */}
        {t.clientPhoto && (
          <div style={{ marginBottom: 24 }}>
            <img src={t.clientPhoto} alt={t.clientName} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: `3px solid ${BRAND.teal}33`, boxShadow: `0 8px 24px ${BRAND.teal}15`, margin: "0 auto" }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
          {[...Array(t.rating)].map((_, i) => <Star key={i} size={18} fill={BRAND.teal} color={BRAND.teal} />)}
        </div>
        <p className="font-display" style={{ fontSize: "clamp(18px, 2.5vw, 26px)", fontStyle: "italic", lineHeight: 1.6, marginBottom: 24, color: BRAND.text }}>
          "{t.quote || t.text}"
        </p>
        <div style={{ color: BRAND.teal, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>{t.clientName || t.name}</div>
        <div style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{t.transactionType || t.type}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 36 }}>
        {testimonials.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 28 : 8, height: 8, background: i === idx ? BRAND.gold : BRAND.border,
            border: "none", cursor: "pointer", transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROPERTY CARD
// ─────────────────────────────────────────────

function PropertyCard({ property: p, onClick }) {
  const isRental = p.type === "rental" || (p.priceLabel && p.priceLabel.includes("/mo")) || p.price < 10000;
  const priceDisplay = isRental
    ? `$${p.price.toLocaleString()}${p.priceLabel || "/mo"}`
    : p.price >= 1000000
      ? `$${(p.price / 1000000).toFixed(p.price >= 10000000 ? 1 : 2)}M`
      : `$${(p.price / 1000).toFixed(0)}K`;
  return (
    <div className="card-hover" onClick={onClick} style={{ cursor: "pointer", background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, overflow: "hidden" }}>
      <div className="img-zoom" style={{ position: "relative", aspectRatio: "4/3" }}>
        <img src={p.images?.[0]?.url || p.img || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8 }}>
          {p.featured && <span style={{ background: BRAND.teal, color: BRAND.bg, fontSize: 10, fontWeight: 700, padding: "4px 10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Featured</span>}
          <span style={{ background: `${BRAND.bg}CC`, color: BRAND.text, fontSize: 10, fontWeight: 600, padding: "4px 10px", letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BRAND.border}` }}>{p.status}</span>
        </div>
      </div>
      <div style={{ padding: 24 }}>
        <div className="font-display gold-text" style={{ fontSize: 24, marginBottom: 6 }}>{priceDisplay}</div>
        <h3 className="font-display" style={{ fontSize: 18, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</h3>
        <p style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 16 }}>{p.address}, {p.city}</p>
        <div style={{ display: "flex", gap: 20, paddingTop: 16, borderTop: `1px solid ${BRAND.border}`, fontSize: 13, color: BRAND.textMuted }}>
          {(p.bedrooms > 0 || p.type !== "land") && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Bed size={14} color={BRAND.teal} />{p.bedrooms || "—"}</span>}
          {(p.bathrooms > 0 || p.type !== "land") && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Bath size={14} color={BRAND.teal} />{p.bathrooms || "—"}</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Square size={14} color={BRAND.teal} />{p.sqft.toLocaleString()} {p.type === "land" ? "sq ft lot" : "sq ft"}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROPERTIES PAGE
// ─────────────────────────────────────────────

function PropertiesPage({ setPage }) {
  const [filter, setFilter] = useState({ status: "", type: "" });
  const filtered = FALLBACK_PROPERTIES.filter(p =>
    (!filter.status || p.status === filter.status) && (!filter.type || p.type === filter.type)
  );

  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 12 }}>Portfolio</h1>
          <p style={{ color: BRAND.textMuted, fontSize: 16, maxWidth: 600, marginBottom: 40 }}>
            Discover our curated selection of extraordinary properties across O'ahu.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: 16, marginBottom: 48, flexWrap: "wrap", padding: 24, background: BRAND.bgCard, border: `1px solid ${BRAND.border}` }}>
            <select className="input-custom" style={{ maxWidth: 200 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Sold">Sold</option>
            </select>
            <select className="input-custom" style={{ maxWidth: 200 }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
              <option value="">All Types</option>
              <option value="Luxury">Luxury</option>
              <option value="Single Family">Single Family</option>
              <option value="Condo">Condo</option>
            </select>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08} direction="up">
              <PropertyCard property={p} onClick={() => { setPage("property-detail"); window.__selectedProperty = p; window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </Reveal>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 80, border: `1px dashed ${BRAND.border}` }}>
            <p className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>No properties found</p>
            <p style={{ color: BRAND.textMuted }}>Adjust filters to see more results.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROPERTY DETAIL
// ─────────────────────────────────────────────

function PropertyDetailPage({ setPage }) {
  const p = window.__selectedProperty || FALLBACK_PROPERTIES[0];
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <button onClick={() => { setPage("properties"); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
          background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontFamily: "'DM Sans', sans-serif",
        }}><ArrowLeft size={14} /> Back to Listings</button>

        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div>
              <span style={{ background: BRAND.teal, color: BRAND.bg, fontSize: 10, fontWeight: 700, padding: "4px 12px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, display: "inline-block" }}>{p.status}</span>
              <h1 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 56px)", marginBottom: 8 }}>{p.title}</h1>
              <p style={{ color: BRAND.textMuted, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><MapPin size={16} color={BRAND.teal} /> {p.address}, {p.city}, {p.state} {p.zip}</p>
            </div>
            <div className="font-display gold-text" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              {(p.type === "rental" || (p.priceLabel && p.priceLabel.includes("/mo")) || p.price < 10000)
                ? `$${p.price.toLocaleString()}${p.priceLabel || "/mo"}`
                : `$${p.price.toLocaleString()}`}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="img-zoom" style={{ marginBottom: 48, border: `1px solid ${BRAND.border}` }}>
            <img src={p.images?.[0]?.url || p.img || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"} alt={p.title} style={{ width: "100%", aspectRatio: "21/9", objectFit: "cover" }} />
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48 }}>
          <div>
            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, padding: "32px 0", borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}`, textAlign: "center", marginBottom: 40 }}>
                {[
                  { icon: <Bed size={24} color={BRAND.teal} />, val: p.bedrooms || p.beds, label: "Bedrooms" },
                  { icon: <Bath size={24} color={BRAND.teal} />, val: p.bathrooms || p.baths, label: "Bathrooms" },
                  { icon: <Square size={24} color={BRAND.teal} />, val: p.sqft.toLocaleString(), label: "Sq Ft" },
                ].map((s, i) => (
                  <div key={i}>{s.icon}<div className="font-display" style={{ fontSize: 28, margin: "8px 0 4px" }}>{s.val}</div><div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.textMuted }}>{s.label}</div></div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h3 className="font-display" style={{ fontSize: 28, marginBottom: 16 }}>About This Property</h3>
              <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.8 }}>{p.description || p.desc}</p>
            </Reveal>
          </div>

          <Reveal direction="left" delay={0.2}>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32, position: "sticky", top: 120 }}>
              <h3 className="font-display" style={{ fontSize: 22, marginBottom: 8 }}>Inquire About This Property</h3>
              <p style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 24 }}>Contact Mel to schedule a private showing.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input className="input-custom" placeholder="First Name" />
                  <input className="input-custom" placeholder="Last Name" />
                </div>
                <input className="input-custom" placeholder="Email" />
                <input className="input-custom" placeholder="Phone" />
                <textarea className="input-custom" placeholder="Message" style={{ minHeight: 100, resize: "vertical" }} defaultValue={`I'm interested in ${p.address}.`} />
                <button className="btn-primary" style={{ width: "100%" }}>Request Information</button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────

function AboutPage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const { data: agent } = useApi(() => api.getAgent(), FALLBACK_AGENT);
  const { data: stats } = useApi(() => api.getStats(), { yearsExperience: 8 });
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 64, alignItems: "center" }}>
          <Reveal direction="right">
            <div className="img-zoom" style={{ position: "relative" }}>
              <img src={agent.photoUrl || agent.photo || FALLBACK_AGENT.photo} alt="Mel" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: -16, right: -16, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "16px 24px" }}>
                <div className="font-display gold-text" style={{ fontSize: 32 }}>{stats.yearsExperience || agent.yearsExperience || 8}+</div>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.textMuted }}>Years in Real Estate</div>
              </div>
            </div>
          </Reveal>
          <Reveal direction="left" delay={0.2}>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 5vw, 60px)", marginBottom: 8 }}>{agent.name}</h1>
            <p style={{ color: BRAND.teal, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{agent.title || FALLBACK_AGENT.title}</p>
            <p style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.12em", marginBottom: 28 }}>License {agent.license || FALLBACK_AGENT.license} · Hawaii Real Estate</p>
            {(agent.bio || agent.shortBio || FALLBACK_AGENT.bio || "").split("\n\n").map((para, i) => (
              <p key={i} style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>{para}</p>
            ))}

            {/* Key stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 32, paddingTop: 32, borderTop: `1px solid ${BRAND.border}` }}>
              {[
                { val: `${stats.yearsExperience || agent.yearsExperience || 8}+`, label: "Years" },
                { val: `${stats.homesSold || 120}+`, label: "Sold" },
                { val: stats.totalSalesVolume ? `$${Math.round(stats.totalSalesVolume/1000000)}M+` : "$75M+", label: "Volume" },
                { val: `${stats.clientSatisfactionRate || 100}%`, label: "Satisfaction" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: "16px 8px", background: BRAND.bgElevated, border: `1px solid ${BRAND.border}` }}>
                  <div className="font-display gold-text" style={{ fontSize: 22, marginBottom: 2 }}>{s.val}</div>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.textDim }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32 }}>
              <div>
                <h4 style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.teal, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Award size={14} /> Specialties</h4>
                {(agent.specialties || FALLBACK_AGENT.specialties).map(s => <div key={s} style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 6 }}>• {s}</div>)}
              </div>
              <div>
                <h4 style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.teal, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><MapPin size={14} /> Areas Served</h4>
                {(agent.serviceAreas || agent.areas || FALLBACK_AGENT.areas).map(a => <div key={a} style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 6 }}>• {a}</div>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => go("contact")}>Work with Mel</button>
              <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 11, padding: "14px 24px" }}>
                <Instagram size={14} /> @mel.castanares
              </a>
            </div>

            {/* Instagram Reel Feature */}
            <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${BRAND.border}` }}>
              <h4 style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.teal, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Play size={14} /> See Mel in Action</h4>
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", maxWidth: 340, border: `1px solid ${BRAND.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
                <iframe
                  src="https://www.instagram.com/reel/DWQWkHZgg2j/embed"
                  style={{ width: "100%", height: 480, border: "none", background: BRAND.bgCard }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NEIGHBORHOODS PAGE
// ─────────────────────────────────────────────

function NeighborhoodsPage() {
  const { data: nResp } = useApi(() => api.getNeighborhoods(), { neighborhoods: FALLBACK_NEIGHBORHOODS });
  const neighborhoods = nResp?.neighborhoods || FALLBACK_NEIGHBORHOODS;
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 12 }}>Neighborhoods</h1>
          <p style={{ color: BRAND.textMuted, fontSize: 16, maxWidth: 600, marginBottom: 56 }}>
            Explore O'ahu's most desirable communities. Each neighborhood has its own unique character and lifestyle.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
          {(nResp?.neighborhoods || FALLBACK_NEIGHBORHOODS).map((n, i) => (
            <Reveal key={n.id} delay={i * 0.1} direction="up">
              <div className="card-hover" style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, overflow: "hidden" }}>
                <div className="img-zoom" style={{ aspectRatio: "16/9" }}>
                  <img src={n.coverImage || n.images?.[0]?.url || n.img} alt={n.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h3 className="font-display" style={{ fontSize: 24, lineHeight: 1.2 }}>{n.name}</h3>
                    <span className="gold-text" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>{n.growth}</span>
                  </div>
                  <p style={{ color: BRAND.teal, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{n.tagline}</p>
                  <p style={{ color: BRAND.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{(n.description || n.desc || "").slice(0, 180)}{(n.description || "").length > 180 ? "…" : ""}</p>
                  {(n as any).highlights && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {(n as any).highlights.map((h: string) => (
                        <span key={h} style={{ fontSize: 10, padding: "3px 8px", background: `${BRAND.teal}12`, color: BRAND.teal, border: `1px solid ${BRAND.teal}30`, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${BRAND.border}` }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.textDim }}>Median Price</div>
                      <div className="font-display gold-text" style={{ fontSize: 20 }}>{n.medianHomePrice || n.medianPrice || "N/A"}</div>
                    </div>
                    <span style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      View Guide <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MARKET DATA PAGE
// ─────────────────────────────────────────────

function MarketPage() {
  const { data: marketData } = useApi(() => api.getMarketData(), { metrics: [
    { label: "Median Home Price", value: "$1.068M", change: "+4.3%", changeDirection: "up" },
    { label: "Active Inventory", value: "1,400", change: "+8.5%", changeDirection: "up" },
    { label: "Avg Days on Market", value: "22", change: "-21%", changeDirection: "down" },
    { label: "List-to-Sale Ratio", value: "98.2%", change: "+1.1%", changeDirection: "up" },
  ], monthlyData: FALLBACK_MARKET_DATA });
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 12 }}>The Market</h1>
          <p style={{ color: BRAND.textMuted, fontSize: 16, maxWidth: 600, marginBottom: 56 }}>
            Stay informed with the latest O'ahu real estate market data and trends.
          </p>
        </Reveal>

        {/* Key Metrics */}
        <Reveal delay={0.1}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 56 }}>
            {[
              { label: "Median Home Price", value: "$1.068M", change: "+4.3%", up: true },
              { label: "Active Inventory", value: "1,400", change: "+8.5%", up: true },
              { label: "Avg Days on Market", value: "22", change: "-21%", up: false },
              { label: "List-to-Sale Ratio", value: "98.2%", change: "+1.1%", up: true },
            ].map((m, i) => (
              <div key={i} style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.textDim, marginBottom: 12 }}>{m.label}</div>
                <div className="font-display" style={{ fontSize: 32, marginBottom: 8 }}>{m.value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: m.up ? "#4CAF50" : BRAND.gold }}>
                  {m.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {m.change} YoY
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Charts */}
        <Reveal delay={0.2}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32 }}>
              <h3 className="font-display" style={{ fontSize: 22, marginBottom: 24 }}>Median Price Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={marketData?.monthlyData || FALLBACK_MARKET_DATA}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND.gold} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BRAND.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                  <XAxis dataKey="month" stroke={BRAND.textDim} fontSize={11} />
                  <YAxis stroke={BRAND.textDim} fontSize={11} tickFormatter={v => `$${v}K`} />
                  <Tooltip contentStyle={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, color: BRAND.text, fontSize: 12 }} />
                  <Area type="monotone" dataKey="median" stroke={BRAND.gold} fill="url(#goldGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32 }}>
              <h3 className="font-display" style={{ fontSize: 22, marginBottom: 24 }}>Inventory & Days on Market</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={marketData?.monthlyData || FALLBACK_MARKET_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                  <XAxis dataKey="month" stroke={BRAND.textDim} fontSize={11} />
                  <YAxis stroke={BRAND.textDim} fontSize={11} />
                  <Tooltip contentStyle={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, color: BRAND.text, fontSize: 12 }} />
                  <Bar dataKey="inventory" fill={BRAND.teal} opacity={0.6} />
                  <Bar dataKey="daysOnMarket" fill={BRAND.goldLight} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BLOG PAGE — Editorial Magazine Layout
// ─────────────────────────────────────────────

function BlogPage({ setPage }) {
  const featured = FALLBACK_BLOG_POSTS.find(p => p.featured);
  const rest = FALLBACK_BLOG_POSTS.filter(p => p.id !== featured?.id);
  const goPost = (post) => { window.__selectedPost = post; setPage("blog-post"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <div style={{ marginBottom: 64 }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 16, fontWeight: 500 }}>The Journal</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 16, lineHeight: 1.05 }}>Real Talk About<br/><span style={{ fontStyle: "italic" }} className="gold-text">Real Estate</span></h1>
            <p style={{ color: BRAND.textMuted, fontSize: 16, maxWidth: 560, lineHeight: 1.7 }}>
              No fluff, no jargon. Just honest perspectives from years in O'ahu's market — the trends, traps, and opportunities most agents won't tell you about.
            </p>
          </div>
        </Reveal>

        {/* Featured hero article */}
        {featured && (
          <Reveal delay={0.1}>
            <div className="card-hover" onClick={() => goPost(featured)} style={{
              cursor: "pointer", position: "relative", marginBottom: 64, overflow: "hidden",
              border: `1px solid ${BRAND.border}`,
            }}>
              <div className="img-zoom" style={{ aspectRatio: "21/9", position: "relative" }}>
                <img src={featured.images?.[0]?.url || featured.img} alt={featured.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.7) 40%, transparent 70%)" }} />
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 48px", maxWidth: 560 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                    <span style={{ background: BRAND.teal, color: BRAND.bg, fontSize: 10, fontWeight: 700, padding: "4px 10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Featured</span>
                    <span style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{featured.category}</span>
                  </div>
                  <h2 className="font-display" style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 16, lineHeight: 1.2, color: BRAND.text }}>{featured.title}</h2>
                  <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{featured.excerpt}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ color: BRAND.text, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      Read Article <ArrowRight size={14} />
                    </span>
                    <span style={{ color: BRAND.textDim, fontSize: 11 }}>•</span>
                    <span style={{ color: BRAND.textDim, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {featured.readTime} min read</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Article grid */}
        <Reveal delay={0.15}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${BRAND.border}` }}>
            <h3 className="font-display" style={{ fontSize: 28 }}>Latest Articles</h3>
            <span style={{ color: BRAND.textDim, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>{FALLBACK_BLOG_POSTS.length} articles</span>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 28 }}>
          {rest.map((post, i) => (
            <Reveal key={post.id} delay={i * 0.08} direction="up">
              <div className="card-hover" onClick={() => goPost(post)} style={{ cursor: "pointer", background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="img-zoom" style={{ aspectRatio: "16/10", position: "relative" }}>
                  <img src={post.images?.[0]?.url || post.img} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 12, left: 12 }}>
                    <span style={{ background: `${BRAND.bg}DD`, backdropFilter: "blur(8px)", color: BRAND.teal, fontSize: 10, fontWeight: 600, padding: "5px 10px", letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BRAND.border}` }}>{post.category}</span>
                  </div>
                </div>
                <div style={{ padding: 28, flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 className="font-display" style={{ fontSize: 22, marginBottom: 12, lineHeight: 1.3, color: BRAND.text }}>{post.title}</h3>
                  <p style={{ color: BRAND.textMuted, fontSize: 13, lineHeight: 1.7, flex: 1, marginBottom: 20 }}>{post.excerpt}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${BRAND.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: BRAND.textDim }}>
                      <span>{post.date}</span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {post.readTime} min</span>
                    </div>
                    <ArrowRight size={16} color={BRAND.teal} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Instagram Feed Section */}
        <Reveal delay={0.2}>
          <div style={{ marginTop: 80, paddingTop: 56, borderTop: `1px solid ${BRAND.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <Instagram size={14} /> On Instagram
                </div>
                <h3 className="font-display" style={{ fontSize: 28 }}>Follow Along</h3>
              </div>
              <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 11, textDecoration: "none", borderRadius: 6 }}>
                <Instagram size={14} /> @mel.castanares
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {IG_FEED_POSTS.map((url, i) => (
                <div key={i} style={{ 
                  background: BRAND.bgCard, 
                  border: `1px solid ${BRAND.border}`, 
                  borderRadius: 12, 
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}>
                  <iframe
                    src={url}
                    style={{ width: "100%", minHeight: 500, border: "none" }}
                    allowFullScreen
                    loading="lazy"
                    scrolling="no"
                  />
                </div>
              ))}
            </div>
            <p style={{ color: BRAND.textDim, fontSize: 13, marginTop: 20, textAlign: "center" }}>
              Real estate tips, market updates, and life in Hawai'i — follow <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer" style={{ color: BRAND.teal, textDecoration: "none", fontWeight: 600 }}>@mel.castanares</a> for the latest.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BLOG POST PAGE — Full Article with Rich Content
// ─────────────────────────────────────────────

// Map blog slugs to relevant Instagram post/reel URLs for embedding
const BLOG_IG_EMBEDS = {
  "why-oahu-buyers-are-winning-right-now": [
    { url: "https://www.instagram.com/reel/DWQWkHZgg2j/embed", caption: "See what's happening in the market right now" },
  ],
  "i-toured-50-open-houses-so-you-dont-have-to": [
    { url: "https://www.instagram.com/p/mel.castanares/embed", caption: "Behind the scenes at open houses" },
  ],
};

// Mel's Instagram posts to feature on the blog page
const IG_FEED_POSTS = [
  "https://www.instagram.com/reel/DWQWkHZgg2j/embed",
  "https://www.instagram.com/mel.castanares/embed",
];

function InstagramEmbed({ url, caption }) {
  return (
    <div style={{ margin: "36px 0" }}>
      <div style={{ 
        background: BRAND.bgLight, 
        border: `1px solid ${BRAND.border}`, 
        borderRadius: 12, 
        overflow: "hidden",
        maxWidth: 480,
      }}>
        <iframe
          src={url}
          style={{ width: "100%", minHeight: 520, border: "none" }}
          allowFullScreen
          loading="lazy"
          scrolling="no"
        />
      </div>
      {caption && (
        <p style={{ color: BRAND.textDim, fontSize: 12, marginTop: 10, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
          <Instagram size={13} color={BRAND.teal} /> {caption}
        </p>
      )}
    </div>
  );
}

const ARTICLE_CONTENT = {
  "why-oahu-buyers-are-winning-right-now": `The dynamic on O'ahu has shifted dramatically in the last six months, and if you're a buyer, this is the window you've been waiting for.\n\nInventory across Honolulu County rose 22% year-over-year, the largest jump since 2019. That means more choices, less competition, and — crucially — more room to negotiate. I've had three buyers in the past month get seller concessions on closing costs that would have been laughed at a year ago.\n\nHere's what's driving the shift: sellers who listed in late 2025 expecting bidding wars are now sitting at 60+ days on market. Price reductions are up 34%. And the psychological effect is real — when buyers see "price reduced" badges, they smell blood in the water.\n\nBut here's the part nobody talks about: mortgage creativity. We're seeing 2-1 buydowns, seller-paid rate locks, and even assumable mortgage transfers on VA and FHA loans. One of my buyers just assumed a 3.2% rate on a Kailua property. That's a game-changer.\n\nFor sellers, the message is clear: the days of "list it and they will come" are over. You need professional photography, strategic pricing from day one, and an agent who actually markets — not just posts on the MLS and prays. If your home has been sitting for 30+ days, we should talk.\n\nThe bottom line: O'ahu is still a fundamentally strong market with limited land, growing demand, and incredible quality of life. But the tactics that work today are different from six months ago. Adapt or wait.`,

  "i-toured-50-open-houses-so-you-dont-have-to": `I decided to do something a little crazy last month. For 30 straight days, I attended every open house I could across O'ahu — from a $450K Makiki studio to a $12M Portlock estate. Fifty properties. Twenty-two neighborhoods. A lot of shoes removed at front doors.\n\nHere's what I found: the homes that went under contract within two weeks all shared five things in common. And none of them were what most sellers obsess over.\n\n1. THEY SMELLED RIGHT. Not like Febreze or candles — like nothing. The fastest-selling homes had zero detectable scent. The ones that lingered? Pet odor, cooking smells embedded in curtains, and that musty "nobody's opened the windows in months" vibe. It's the #1 silent deal-killer.\n\n2. THE FIRST 8 SECONDS WERE CHOREOGRAPHED. The homes that sold fast had a clear visual "moment" within seconds of walking in — an ocean view framed by a hallway, a dramatic staircase, a kitchen island that pulled you forward. The slow sellers? You walked in and saw... a wall. Or a cluttered entryway. First impressions aren't a cliché, they're neuroscience.\n\n3. NATURAL LIGHT WAS MAXIMIZED, NOT JUST PRESENT. Every fast-selling home had sheer curtains or bare windows. Every slow seller had heavy drapes or dated blinds. In Hawai'i, light IS the luxury. Let it in.\n\n4. THE OUTDOOR SPACE FELT INTENTIONAL. Even a tiny lanai with two chairs, a plant, and string lights outsold homes with a big bare concrete patio. Buyers are imagining their morning coffee. Give them the vision.\n\n5. PRICING WAS SHARP, NOT ASPIRATIONAL. The homes priced 2-3% below comparable sales generated multiple offers. The ones priced "to leave room for negotiation" sat. In this market, your first two weeks determine everything.\n\nWhat didn't matter as much as sellers think? Granite vs. quartz countertops (nobody cared). Smart home features (cool but not a dealmaker). Paint color (as long as it was neutral). Crown molding (I'm sorry, it's true).\n\nThe takeaway: selling a home in 2026 is about sensory experience, not just square footage.`,

  "default": `This article explores one of the most important topics facing O'ahu home buyers and sellers today. The local market continues to present unique opportunities for those who understand the dynamics at play.\n\nWith Mel's 8 years in the Hawai'i market navigating Honolulu's real estate landscape, she's developed insights that go beyond what the data shows. The human element — understanding neighborhoods, reading market psychology, and building relationships with other agents — often makes the difference between an okay deal and an exceptional one.\n\nWhether you're a first-time buyer nervous about the process or a seasoned investor looking for your next opportunity, the current market has something for you. The key is having the right strategy and the right advisor in your corner.\n\nReach out to Mel to discuss how these insights apply to your specific situation. Every transaction is unique, and cookie-cutter advice rarely leads to the best outcomes.`
};

function BlogPostPage({ setPage }) {
  const post = window.__selectedPost || FALLBACK_BLOG_POSTS[0];
  const content = ARTICLE_CONTENT[post.slug] || ARTICLE_CONTENT["default"];

  return (
    <div style={{ paddingTop: 120 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 120px" }}>
        <button onClick={() => { setPage("blog"); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
          background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 40, fontFamily: "'DM Sans', sans-serif",
        }}><ArrowLeft size={14} /> Back to The Journal</button>

        <Reveal>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>{post.category}</div>
            <h1 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.2, marginBottom: 24 }}>{post.title}</h1>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 12, color: BRAND.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 32, borderBottom: `1px solid ${BRAND.border}` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} color={BRAND.teal} /> {post.date}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={14} color={BRAND.teal} /> {post.readTime} Min</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="img-zoom" style={{ margin: "40px 0", border: `1px solid ${BRAND.border}` }}>
            <img src={post.images?.[0]?.url || post.img} alt={post.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{ color: BRAND.textMuted, fontSize: 17, lineHeight: 2 }}>
            {content.split("\n\n").map((para, i) => {
              const isNumbered = /^\d+\./.test(para.trim());
              const isBold = para.trim().startsWith("1.") || para.trim().startsWith("2.") || para.trim().startsWith("3.") || para.trim().startsWith("4.") || para.trim().startsWith("5.");
              return (
                <p key={i} style={{ 
                  marginTop: i === 0 ? 0 : 28,
                  ...(isBold ? { color: BRAND.text, fontWeight: 500, fontSize: 18, lineHeight: 1.8 } : {}),
                }}>
                  {para}
                </p>
              );
            })}
          </div>
        </Reveal>

        {/* Instagram embeds related to this article */}
        {BLOG_IG_EMBEDS[post.slug] && BLOG_IG_EMBEDS[post.slug].length > 0 && (
          <Reveal delay={0.35}>
            <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${BRAND.border}` }}>
              <h4 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.teal, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <Instagram size={16} /> From Mel's Instagram
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {BLOG_IG_EMBEDS[post.slug].map((embed, i) => (
                  <InstagramEmbed key={i} url={embed.url} caption={embed.caption} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Author card */}
        <Reveal delay={0.4}>
          <div style={{ marginTop: 56, padding: 32, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, display: "flex", gap: 20, alignItems: "center" }}>
            <img src={FALLBACK_AGENT.photo} alt={FALLBACK_AGENT.name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Written by {FALLBACK_AGENT.name}</div>
              <div style={{ color: BRAND.textMuted, fontSize: 13 }}>{FALLBACK_AGENT.title} · {FALLBACK_AGENT.stats.years}+ years on O'ahu</div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────────

function ContactPage() {
  const { data: agent } = useApi(() => api.getAgent(), FALLBACK_AGENT);
  const [sent, setSent] = useState(false);
  const handleContactSubmit = async (formData) => {
    await api.submitContact(formData);
    setSent(true);
  };
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 64px" }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Connect</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 12 }}>Start the Conversation</h1>
            <p style={{ color: BRAND.textMuted, fontSize: 16 }}>Whether buying, selling, or investing — Mel is ready to help with absolute discretion.</p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48 }}>
          <Reveal direction="right">
            <h3 className="font-display" style={{ fontSize: 28, marginBottom: 32 }}>Direct Contact</h3>
            {[
              { icon: <Phone size={20} color={BRAND.teal} />, label: "Phone", value: agent.phone || FALLBACK_AGENT.phone, href: `tel:${(agent.phone || FALLBACK_AGENT.phone).replace(/\D/g,"")}` },
              { icon: <Mail size={20} color={BRAND.teal} />, label: "Email", value: agent.email || FALLBACK_AGENT.email, href: `mailto:${agent.email || FALLBACK_AGENT.email}` },
              { icon: <Instagram size={20} color={BRAND.teal} />, label: "Instagram", value: "@mel.castanares", href: "https://www.instagram.com/mel.castanares" },
              { icon: <MapPin size={20} color={BRAND.teal} />, label: "Office", value: `${agent.brokerage || FALLBACK_AGENT.brokerage}\n${agent.brokerageAddress || agent.address || FALLBACK_AGENT.address}`, href: undefined },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: BRAND.textDim, marginBottom: 4 }}>{c.label}</div>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ fontSize: 16, whiteSpace: "pre-line", color: BRAND.text, textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.color = BRAND.teal)} onMouseLeave={e => (e.currentTarget.style.color = BRAND.text)}>
                      {c.value}
                    </a>
                  ) : (
                    <div style={{ fontSize: 16, whiteSpace: "pre-line" }}>{c.value}</div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: "16px 20px", background: BRAND.bgElevated, border: `1px solid ${BRAND.border}`, fontSize: 12, color: BRAND.textDim }}>
              <span style={{ color: BRAND.teal, fontWeight: 600 }}>License RS-84753</span> · Dream Home Realty Hawaii LLC · State of Hawai'i
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.2}>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 40 }}>
              {sent ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={48} color={BRAND.teal} style={{ marginBottom: 16 }} />
                  <h3 className="font-display" style={{ fontSize: 28, marginBottom: 8 }}>Inquiry Received</h3>
                  <p style={{ color: BRAND.textMuted }}>Mel will be in touch shortly.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <input className="input-custom" placeholder="First Name" />
                    <input className="input-custom" placeholder="Last Name" />
                  </div>
                  <input className="input-custom" placeholder="Email" />
                  <input className="input-custom" placeholder="Phone" />
                  <select className="input-custom">
                    <option>General Inquiry</option>
                    <option>Looking to Buy</option>
                    <option>Looking to Sell</option>
                    <option>Investment</option>
                    <option>Relocation</option>
                  </select>
                  <textarea className="input-custom" placeholder="How can we help?" style={{ minHeight: 120, resize: "vertical" }} />
                  <button className="btn-primary" style={{ width: "100%" }} onClick={() => setSent(true)}>Send Message</button>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUYER'S EXPERIENCE PAGE
// ─────────────────────────────────────────────

function BuyersPage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const steps = [
    { num: "01", title: "Discovery Call", desc: "We start with a conversation about your goals, timeline, budget, and lifestyle preferences to create a personalized search strategy.", icon: "🤙" },
    { num: "02", title: "Pre-Approval", desc: "Mel connects you with trusted lenders to secure pre-approval, giving you a competitive edge in Hawai'i's market.", icon: "💰" },
    { num: "03", title: "Curated Showings", desc: "No scrolling through hundreds of listings. Mel hand-picks properties that match your criteria and arranges private showings.", icon: "🏡" },
    { num: "04", title: "Offer & Negotiation", desc: "When you find the one, Mel crafts a strategic offer and negotiates terms that protect your interests.", icon: "📝" },
    { num: "05", title: "Close & Celebrate", desc: "From inspections to closing, Mel coordinates every detail so you can focus on planning your move to paradise.", icon: "🎉" },
  ];

  return (
    <div style={{ paddingTop: 120 }}>
      {/* Cinematic Hero */}
      <section style={{ position: "relative", padding: "100px 24px 120px", overflow: "hidden" }}>
        <img src="/images/mel-showing.jpg" alt="Mel showing a home" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(27,42,51,0.85) 0%, rgba(26,138,125,0.6) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{ color: "#fff", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 16, fontWeight: 500, opacity: 0.8 }}>Your Journey</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 7vw, 68px)", marginBottom: 20, color: "#fff", lineHeight: 1.05 }}>
              Finding Home<br/>Should Feel Like <span style={{ fontStyle: "italic", color: BRAND.goldLight }}>This</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
              Not stressful. Not confusing. Just exciting — the way it's supposed to be. Here's how Mel makes it happen.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Steps as cards with numbers */}
      <div className="section-pad">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 56 }}>
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.1} direction="up">
              <div className="card-hover" style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32, height: "100%", borderRadius: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -12, right: -8, fontSize: 80, fontFamily: "'DM Serif Display', serif", color: BRAND.teal, opacity: 0.06, lineHeight: 1 }}>{step.num}</div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{step.icon}</div>
                <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Step {step.num}</div>
                <h3 className="font-display" style={{ fontSize: 24, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA band */}
        <Reveal>
          <div style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})`, padding: "48px 40px", borderRadius: 16, textAlign: "center", color: "#fff" }}>
            <h2 className="font-display" style={{ fontSize: 32, marginBottom: 12 }}>Ready to Start?</h2>
            <p style={{ opacity: 0.8, fontSize: 15, marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>Every journey starts with a conversation. Mel's here to answer your questions — no pressure, no obligations.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => go("contact")} style={{ background: "#fff", color: BRAND.teal }}>Let's Talk</button>
              <button className="btn-outline" onClick={() => go("mortgage")} style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>Mortgage Calculator</button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SELLER'S EXPERIENCE PAGE
// ─────────────────────────────────────────────

function SellersPage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const steps = [
    { num: "01", title: "Market Analysis", desc: "Mel provides a comprehensive comparative market analysis so you know your home's true value in today's market.", icon: "📊" },
    { num: "02", title: "Strategic Pricing", desc: "Using data and market expertise, Mel positions your property to attract serious buyers while maximizing your return.", icon: "🎯" },
    { num: "03", title: "Luxury Marketing", desc: "Professional photography, videography, drone footage, staging, and targeted digital campaigns to showcase your property.", icon: "📸" },
    { num: "04", title: "Showings & Offers", desc: "Mel handles all inquiries, conducts showings, and presents offers with clear analysis so you can make informed decisions.", icon: "🔑" },
    { num: "05", title: "Negotiation & Close", desc: "From offer acceptance through escrow, Mel negotiates fiercely on your behalf and manages every detail to closing.", icon: "🎉" },
  ];

  return (
    <div style={{ paddingTop: 120 }}>
      {/* Hero */}
      <section style={{ position: "relative", padding: "100px 24px 120px", overflow: "hidden" }}>
        <img src="https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1600&q=80" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(27,42,51,0.88) 0%, rgba(212,168,83,0.5) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{ color: "#fff", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 16, fontWeight: 500, opacity: 0.8 }}>Your Journey</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 7vw, 68px)", marginBottom: 20, color: "#fff", lineHeight: 1.05 }}>
              Sell Smart.<br/><span style={{ fontStyle: "italic", color: BRAND.goldLight }}>Sell for More.</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
              Your home is your biggest asset. Mel's strategic approach means more money in your pocket and less stress on your shoulders.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Steps as visual timeline cards */}
      <div className="section-pad">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 56 }}>
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.1} direction="up">
              <div className="card-hover" style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32, height: "100%", borderRadius: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -12, right: -8, fontSize: 80, fontFamily: "'DM Serif Display', serif", color: BRAND.gold, opacity: 0.06, lineHeight: 1 }}>{step.num}</div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{step.icon}</div>
                <div style={{ color: BRAND.gold, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Step {step.num}</div>
                <h3 className="font-display" style={{ fontSize: 24, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA band */}
        <Reveal>
          <div style={{ background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark})`, padding: "48px 40px", borderRadius: 16, textAlign: "center", color: "#fff" }}>
            <h2 className="font-display" style={{ fontSize: 32, marginBottom: 12 }}>What's Your Home Worth?</h2>
            <p style={{ opacity: 0.85, fontSize: 15, marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>Get a free, no-obligation market analysis. Mel will tell you exactly what your home could sell for in today's market.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => go("valuation")} style={{ background: "#fff", color: BRAND.goldDark }}>Get My Valuation</button>
              <button className="btn-outline" onClick={() => go("contact")} style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>Talk to Mel</button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MORTGAGE CALCULATOR PAGE
// ─────────────────────────────────────────────

function MortgageCalculatorPage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const [price, setPrice] = useState(850000);
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(6.75);
  const [term, setTerm] = useState(30);
  const [tax, setTax] = useState(0.35);
  const [insurance, setInsurance] = useState(150);
  const [hoa, setHoa] = useState(0);

  const loanAmount = price * (1 - down / 100);
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;
  const monthlyPI = monthlyRate > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const monthlyTax = (price * (tax / 100)) / 12;
  const totalMonthly = monthlyPI + monthlyTax + insurance + hoa;
  const totalInterest = (monthlyPI * numPayments) - loanAmount;
  const totalCost = monthlyPI * numPayments + monthlyTax * numPayments + insurance * numPayments + hoa * numPayments;

  const piPct = (monthlyPI / totalMonthly * 100).toFixed(0);
  const taxPct = (monthlyTax / totalMonthly * 100).toFixed(0);
  const insPct = (insurance / totalMonthly * 100).toFixed(0);
  const hoaPct = hoa > 0 ? (hoa / totalMonthly * 100).toFixed(0) : 0;

  const SliderInput = ({ label, value, onChange, min, max, step, prefix="", suffix="" }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textMuted, fontWeight: 500 }}>{label}</label>
        <span className="font-display" style={{ fontSize: 22, color: BRAND.text }}>{prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} 
        style={{ width: "100%", accentColor: BRAND.teal, height: 6, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: BRAND.textDim, marginTop: 4 }}>
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Plan Your Budget</div>
            <h1 className="font-display" style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 12 }}>Mortgage Calculator</h1>
            <p style={{ color: BRAND.textMuted, fontSize: 16, lineHeight: 1.7 }}>
              Estimate your monthly payment and see how different scenarios affect your budget. Hawai'i property tax rates are among the lowest in the nation.
            </p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 40 }}>
          {/* Left: Sliders */}
          <Reveal direction="right">
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 36, borderRadius: 12 }}>
              <SliderInput label="Home Price" value={price} onChange={setPrice} min={200000} max={5000000} step={25000} prefix="$" />
              <SliderInput label="Down Payment" value={down} onChange={setDown} min={0} max={50} step={1} suffix="%" />
              <SliderInput label="Interest Rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} suffix="%" />
              
              <div style={{ marginBottom: 28 }}>
                <label style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textMuted, fontWeight: 500, display: "block", marginBottom: 10 }}>Loan Term</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {[15, 20, 30].map(t => (
                    <button key={t} onClick={() => setTerm(t)} style={{
                      flex: 1, padding: "12px 0", border: `1px solid ${term === t ? BRAND.teal : BRAND.border}`,
                      background: term === t ? `${BRAND.teal}12` : "transparent", color: term === t ? BRAND.teal : BRAND.textMuted,
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", borderRadius: 8,
                      transition: "all 0.3s",
                    }}>{t} yr</button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 24, marginTop: 8 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textDim, marginBottom: 16 }}>Additional Costs</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: BRAND.textMuted, display: "block", marginBottom: 4 }}>Property Tax Rate</label>
                    <input className="input-custom" type="number" step="0.01" value={tax} onChange={e => setTax(Number(e.target.value))} style={{ fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: BRAND.textMuted, display: "block", marginBottom: 4 }}>Insurance $/mo</label>
                    <input className="input-custom" type="number" step="10" value={insurance} onChange={e => setInsurance(Number(e.target.value))} style={{ fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: BRAND.textMuted, display: "block", marginBottom: 4 }}>HOA $/mo</label>
                    <input className="input-custom" type="number" step="25" value={hoa} onChange={e => setHoa(Number(e.target.value))} style={{ fontSize: 14 }} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: Results */}
          <Reveal direction="left" delay={0.15}>
            <div style={{ position: "sticky", top: 120 }}>
              {/* Monthly Payment Hero */}
              <div style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})`, padding: 40, borderRadius: 12, color: "#fff", textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>Estimated Monthly Payment</div>
                <div className="font-display" style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>${Math.round(totalMonthly).toLocaleString()}</div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>per month</div>
              </div>

              {/* Breakdown */}
              <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 32, borderRadius: 12 }}>
                <h3 className="font-display" style={{ fontSize: 20, marginBottom: 20 }}>Payment Breakdown</h3>
                
                {[
                  { label: "Principal & Interest", value: monthlyPI, color: BRAND.teal, pct: piPct },
                  { label: "Property Tax", value: monthlyTax, color: BRAND.gold, pct: taxPct },
                  { label: "Insurance", value: insurance, color: BRAND.coral, pct: insPct },
                  ...(hoa > 0 ? [{ label: "HOA", value: hoa, color: "#8B5CF6", pct: hoaPct }] : []),
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                      <span style={{ fontSize: 14, color: BRAND.textMuted }}>{item.label}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>${Math.round(item.value).toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: BRAND.textDim, marginLeft: 8 }}>{item.pct}%</span>
                    </div>
                  </div>
                ))}

                {/* Stacked bar */}
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 20, marginBottom: 24 }}>
                  <div style={{ width: `${piPct}%`, background: BRAND.teal }} />
                  <div style={{ width: `${taxPct}%`, background: BRAND.gold }} />
                  <div style={{ width: `${insPct}%`, background: BRAND.coral }} />
                  {hoa > 0 && <div style={{ width: `${hoaPct}%`, background: "#8B5CF6" }} />}
                </div>

                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ padding: 16, background: BRAND.bgElevated, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Loan Amount</div>
                    <div className="font-display" style={{ fontSize: 20 }}>${Math.round(loanAmount).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 16, background: BRAND.bgElevated, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Down Payment</div>
                    <div className="font-display" style={{ fontSize: 20 }}>${Math.round(price * down / 100).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 16, background: BRAND.bgElevated, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Total Interest</div>
                    <div className="font-display" style={{ fontSize: 20 }}>${Math.round(totalInterest).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 16, background: BRAND.bgElevated, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Total Cost</div>
                    <div className="font-display" style={{ fontSize: 20 }}>${Math.round(totalCost).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ marginTop: 20, padding: 24, background: BRAND.bgLight, border: `1px solid ${BRAND.border}`, borderRadius: 12, textAlign: "center" }}>
                <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 16 }}>Ready to explore homes in your budget?</p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={() => go("contact")}>Talk to Mel</button>
                  <button className="btn-outline" onClick={() => go("properties")}>Browse Listings</button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Disclaimer */}
        <Reveal delay={0.3}>
          <p style={{ color: BRAND.textDim, fontSize: 12, marginTop: 48, lineHeight: 1.7, maxWidth: 700 }}>
            * This calculator provides estimates for informational purposes only. Actual payments may vary based on lender terms, credit score, and other factors. Hawai'i's effective property tax rate averages ~0.35%, among the lowest in the U.S. Contact Mel for personalized guidance and lender recommendations.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME VALUATION PAGE
// ─────────────────────────────────────────────

function ValuationPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 64, alignItems: "center" }}>
          <Reveal direction="right">
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Free Report</div>
            <h1 className="font-display" style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 16 }}>What's Your Home Worth?</h1>
            <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Get a comprehensive market analysis of your property. Mel will review comparable sales, market conditions, and unique features to provide an accurate estimate of your home's current value.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { icon: <BarChart3 size={20} color={BRAND.teal} />, text: "Detailed comparative market analysis" },
                { icon: <TrendingUp size={20} color={BRAND.teal} />, text: "Current market trends and projections" },
                { icon: <FileText size={20} color={BRAND.teal} />, text: "Personalized pricing strategy recommendations" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {item.icon}
                  <span style={{ color: BRAND.textMuted, fontSize: 14 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.2}>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: 40 }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={48} color={BRAND.teal} style={{ marginBottom: 16 }} />
                  <h3 className="font-display" style={{ fontSize: 28, marginBottom: 8 }}>Request Received!</h3>
                  <p style={{ color: BRAND.textMuted }}>Mel will prepare your personalized home valuation report within 24 hours.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 className="font-display" style={{ fontSize: 22, marginBottom: 4 }}>Request Your Valuation</h3>
                  <input className="input-custom" placeholder="Property Address" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <input className="input-custom" placeholder="First Name" />
                    <input className="input-custom" placeholder="Last Name" />
                  </div>
                  <input className="input-custom" placeholder="Email" />
                  <input className="input-custom" placeholder="Phone" />
                  <select className="input-custom">
                    <option>Timeline...</option>
                    <option>Selling within 3 months</option>
                    <option>Selling within 6 months</option>
                    <option>Selling within 1 year</option>
                    <option>Just curious</option>
                  </select>
                  <button className="btn-primary" style={{ width: "100%" }} onClick={() => setSubmitted(true)}>Get My Valuation</button>
                  <a href="https://docs.google.com/forms/d/e/1FAIpQLScxHvlGhr7mD8n-fjXwglrVsJe9xquMlb9qQFKa5V63UtOYRA/viewform?usp=sf_link" target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", marginTop: 12, color: BRAND.teal, fontSize: 12, textDecoration: "none", fontWeight: 500 }}>Or fill out our detailed questionnaire →</a>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RELOCATION GUIDE
// ─────────────────────────────────────────────

function RelocationPage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const sections = [
    { icon: <Compass size={24} color={BRAND.teal} />, title: "Island Overview", desc: "O'ahu is home to nearly 1 million residents and offers an incredible mix of urban convenience and natural beauty. Honolulu provides world-class dining, shopping, and culture, while the windward and north shores offer serene island living." },
    { icon: <Building size={24} color={BRAND.teal} />, title: "Cost of Living", desc: "Hawaii's cost of living is higher than the national average, with housing being the largest factor. However, many find the quality of life, climate, and outdoor access more than compensate. Mel can help you find the best value for your budget." },
    { icon: <BookOpen size={24} color={BRAND.teal} />, title: "Schools & Education", desc: "O'ahu has a mix of excellent public and private schools. Top-rated private schools include Punahou, Iolani, and Mid-Pacific Institute. The University of Hawaii system provides strong higher education options." },
    { icon: <Heart size={24} color={BRAND.teal} />, title: "Lifestyle & Culture", desc: "Hawaii's aloha spirit is real. Expect a slower pace, deep community ties, and a multicultural environment unlike anywhere else. From hiking and surfing to food festivals and cultural celebrations, there's always something happening." },
    { icon: <Shield size={24} color={BRAND.teal} />, title: "Logistics & Tips", desc: "Shipping your belongings, getting a Hawaii driver's license, registering your vehicle, establishing residency — Mel has helped dozens of families relocate and has resources for every step of the transition." },
  ];

  return (
    <div style={{ paddingTop: 120 }}>
      <section style={{ position: "relative", padding: "80px 24px 100px", textAlign: "center" }}>
        <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Moving to Hawai'i</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 16 }}>Relocation Guide</h1>
            <p style={{ color: BRAND.textMuted, fontSize: 16, lineHeight: 1.7 }}>
              Everything you need to know about making the move to O'ahu. Mel has helped dozens of families transition to island life.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="section-pad">
        {sections.map((s, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div style={{ display: "flex", gap: 24, marginBottom: 48, paddingBottom: 48, borderBottom: i < sections.length - 1 ? `1px solid ${BRAND.border}` : "none" }}>
              <div style={{ width: 56, height: 56, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <h3 className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.7 }}>{s.description || s.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button className="btn-primary" onClick={() => go("contact")}>Get Personalized Relocation Help</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TESTIMONIALS PAGE
// ─────────────────────────────────────────────

function TestimonialsPage() {
  const { data: testiResp } = useApi(() => api.getTestimonials(), { testimonials: FALLBACK_TESTIMONIALS });
  const testimonials = testiResp?.testimonials || FALLBACK_TESTIMONIALS;
  return (
    <div style={{ paddingTop: 120 }}>
      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal>
          <h1 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 12 }}>Testimonials</h1>
          <p style={{ color: BRAND.textMuted, fontSize: 16, maxWidth: 600, marginBottom: 56 }}>
            See why Mel's clients love working with her.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {(testiResp?.testimonials || FALLBACK_TESTIMONIALS).map((t, i) => (
            <Reveal key={i} delay={i * 0.08} direction="up">
              <div className="shimmer" style={{ background: BRAND.bgCard, border: `1px solid ${t.featured ? BRAND.teal + '44' : BRAND.border}`, padding: 32, borderRadius: t.featured ? 12 : 0, position: "relative", overflow: "hidden" }}>
                {t.featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})` }} />}
                {t.clientPhoto && (
                  <div style={{ marginBottom: 20, textAlign: "center" }}>
                    <img src={t.clientPhoto} alt={t.clientName} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BRAND.teal}33` }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, marginBottom: 16, justifyContent: t.clientPhoto ? "center" : "flex-start" }}>
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={16} fill={BRAND.teal} color={BRAND.teal} />)}
                </div>
                <p className="font-display" style={{ fontSize: 17, fontStyle: "italic", lineHeight: 1.6, marginBottom: 20, textAlign: t.clientPhoto ? "center" : "left" }}>"{t.quote || t.text}"</p>
                <div style={{ display: "flex", justifyContent: t.clientPhoto ? "center" : "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${BRAND.border}` }}>
                  <div style={{ textAlign: t.clientPhoto ? "center" : "left" }}>
                    <div style={{ color: BRAND.teal, fontSize: 13, fontWeight: 600 }}>{t.clientName || t.name}</div>
                    <div style={{ color: BRAND.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t.transactionType || t.type}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────

function Footer({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const { data: agent } = useApi(() => api.getAgent(), FALLBACK_AGENT);

  return (
    <footer style={{ background: BRAND.bgLight, borderTop: `1px solid ${BRAND.border}`, paddingTop: 80, paddingBottom: 40 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, border: `1px solid ${BRAND.gold}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
              <span style={{ transform: "rotate(-45deg)", fontFamily: "'DM Serif Display', serif", fontSize: 14, color: BRAND.teal, fontWeight: 600 }}>M</span>
            </div>
            <span className="font-display" style={{ fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.teal }}>Mel Castanares</span>
          </div>
          <p style={{ color: BRAND.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
            O'ahu-born mama REALTOR® helping families find their place in paradise.
          </p>
          <p style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.05em", marginBottom: 20 }}>
            License RS-84753 · Dream Home Realty Hawaii LLC
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { Icon: Instagram, href: "https://www.instagram.com/mel.castanares", label: "Instagram" },
              { Icon: Facebook, href: "https://www.facebook.com/dreamhomehi", label: "Facebook" },
              { Icon: Linkedin, href: "#", label: "LinkedIn" },
            ].map(({ Icon, href, label }, i) => (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                style={{ width: 36, height: 36, border: `1px solid ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = BRAND.teal; (e.currentTarget as HTMLElement).style.background = `${BRAND.teal}10`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BRAND.border; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <Icon size={16} color={BRAND.textMuted} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.text, marginBottom: 20 }}>Explore</h4>
          {[
            { label: "Portfolio", page: "properties" },
            { label: "Neighborhoods", page: "neighborhoods" },
            { label: "Market Data", page: "market" },
            { label: "Insights", page: "blog" },
            { label: "About Mel", page: "about" },
          ].map((link, i) => (
            <button key={i} onClick={() => go(link.page)} style={{
              display: "block", background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer",
              fontSize: 13, marginBottom: 12, fontFamily: "'DM Sans', sans-serif", padding: 0, transition: "color 0.3s",
            }} onMouseEnter={e => e.target.style.color = BRAND.gold} onMouseLeave={e => e.target.style.color = BRAND.textMuted}>
              {link.label}
            </button>
          ))}
        </div>

        <div>
          <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.text, marginBottom: 20 }}>Services</h4>
          {[
            { label: "Buyer's Experience", page: "buyers" },
            { label: "Seller's Experience", page: "sellers" },
            { label: "Home Valuation", page: "valuation" },
            { label: "Relocation Guide", page: "relocation" },
            { label: "Testimonials", page: "testimonials" },
          ].map((link, i) => (
            <button key={i} onClick={() => go(link.page)} style={{
              display: "block", background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer",
              fontSize: 13, marginBottom: 12, fontFamily: "'DM Sans', sans-serif", padding: 0, transition: "color 0.3s",
            }} onMouseEnter={e => e.target.style.color = BRAND.gold} onMouseLeave={e => e.target.style.color = BRAND.textMuted}>
              {link.label}
            </button>
          ))}
        </div>

        <div>
          <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND.text, marginBottom: 20 }}>Contact</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a href={`tel:${(agent.phone || FALLBACK_AGENT.phone).replace(/\D/g,"")}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: BRAND.textMuted, textDecoration: "none" }}>
              <Phone size={14} color={BRAND.teal} /> {agent.phone || FALLBACK_AGENT.phone}
            </a>
            <a href={`mailto:${agent.email || FALLBACK_AGENT.email}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: BRAND.textMuted, textDecoration: "none" }}>
              <Mail size={14} color={BRAND.teal} /> {agent.email || FALLBACK_AGENT.email}
            </a>
            <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: BRAND.textMuted, textDecoration: "none" }}>
              <Instagram size={14} color={BRAND.teal} /> @mel.castanares
            </a>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: BRAND.textMuted }}>
              <MapPin size={14} color={BRAND.teal} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ whiteSpace: "pre-line" }}>{agent.brokerage || FALLBACK_AGENT.brokerage}{"\n"}{agent.brokerageAddress || agent.address || FALLBACK_AGENT.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 0", marginTop: 48, borderTop: `1px solid ${BRAND.border}` }}>
        <p style={{ fontSize: 12, color: BRAND.textDim, lineHeight: 1.7, marginBottom: 20, maxWidth: 900 }}>
          Mel Castanares is a licensed REALTOR® in the State of Hawai'i (License RS-84753), affiliated with Dream Home Realty Hawaii LLC. All information provided on this website is for general informational purposes only and is subject to change. Property listings, market data, and estimates are not guarantees of sale or value. Contact Mel for personalized real estate advice.
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textDim }}>
            © {new Date().getFullYear()} Mel Castanares · RS-84753 · Dream Home Realty Hawaii LLC. All Rights Reserved.
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: BRAND.textDim, textDecoration: "none", transition: "color 0.3s" }}
              onMouseEnter={e => (e.currentTarget.style.color = BRAND.teal)} onMouseLeave={e => (e.currentTarget.style.color = BRAND.textDim)}>
              <Instagram size={13} /> @mel.castanares
            </a>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textDim, cursor: "pointer" }}>Privacy Policy</span>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textDim, cursor: "pointer" }}>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// FLOATING ACTIONS — Contact CTA + AI Chat
// ─────────────────────────────────────────────

function FloatingActions({ setPage }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Aloha! 🌺 I'm Mel's AI assistant. Ask me about buying or selling a home in Hawai'i, O'ahu neighborhoods, or anything real estate!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (chatOpen && inputRef.current) inputRef.current.focus(); }, [chatOpen]);

  const CHAT_URL = "https://mel-ai-chat.gorjessbbyx3.workers.dev";

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.filter(m => m.role !== "system") }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "Hmm, let me try again. In the meantime, reach Mel at (808) 285-8774!" }]);
    } catch {
      // Fallback: simple local responses when worker isn't deployed yet
      const q = input.trim().toLowerCase();
      let reply = "Great question! For the most accurate answer, I'd recommend reaching out to Mel directly at (808) 285-8774 or mel@homesweethomehawaii.com. She knows O'ahu inside and out! 🤙";
      if (q.includes("neighborhood") || q.includes("area") || q.includes("where")) {
        reply = "O'ahu has amazing neighborhoods! Mililani is great for families, Kailua has world-class beaches, Kapolei is the growing 'second city,' and Kāne'ohe has stunning mountain views. Want specifics? Call Mel at (808) 285-8774 — she grew up here! 🏝️";
      } else if (q.includes("buy") || q.includes("first time") || q.includes("afford")) {
        reply = "Buying in Hawai'i is exciting! Median condo prices are around $500K, single-family homes around $1M on O'ahu. VA loans (0% down) are popular here due to military presence. Check out the mortgage calculator on this site, or call Mel at (808) 285-8774 for personalized guidance! 🏡";
      } else if (q.includes("sell") || q.includes("worth") || q.includes("value")) {
        reply = "Thinking about selling? The O'ahu market is active right now. Head to the Home Valuation page for a free analysis, or call Mel at (808) 285-8774 — she'll give you a real number based on recent comps in your area! 📊";
      } else if (q.includes("mel") || q.includes("about") || q.includes("who")) {
        reply = "Mel Castanares is an O'ahu-born REALTOR® at Dream Home Realty Hawai'i. She specializes in helping first-time buyers and families find their perfect home. She's known for making the process feel easy and personal. Reach her at (808) 285-8774! 🌺";
      } else if (q.includes("down payment") || q.includes("mortgage") || q.includes("loan")) {
        reply = "In Hawai'i, conventional loans typically need 3-20% down. VA loans offer 0% down (big here!), and FHA loans need 3.5%. Property taxes are super low (~0.35%). Try the mortgage calculator on this site for exact numbers! 💰";
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .float-btn { position: fixed; right: 24px; z-index: 1000; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; box-shadow: 0 6px 24px rgba(0,0,0,0.15); }
        .float-btn:hover { transform: scale(1.08); }
        .float-contact { bottom: 96px; background: ${BRAND.gold}; color: #fff; }
        .float-contact:hover { box-shadow: 0 8px 32px ${BRAND.gold}44; }
        .float-chat { bottom: 24px; background: linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealLight}); color: #fff; }
        .float-chat:hover { box-shadow: 0 8px 32px ${BRAND.teal}44; }
        .float-chat.open { transform: rotate(90deg) scale(0.9); }
        .float-pulse { animation: fPulse 2.5s ease-in-out infinite; }
        @keyframes fPulse { 0%,100% { box-shadow: 0 6px 24px rgba(0,0,0,0.15); } 50% { box-shadow: 0 6px 24px rgba(0,0,0,0.15), 0 0 0 10px ${BRAND.teal}00; } }
        .contact-popup { position: fixed; bottom: 160px; right: 24px; z-index: 999; background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border}; border-radius: 16px; padding: 20px; width: 260px; box-shadow: 0 16px 48px rgba(0,0,0,0.1); animation: chatSlideIn 0.3s ease; }
        .contact-popup a { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; text-decoration: none; color: ${BRAND.text}; font-size: 14px; font-weight: 500; transition: background 0.2s; }
        .contact-popup a:hover { background: ${BRAND.bgEl}; }
        .chat-window { position: fixed; bottom: 92px; right: 24px; z-index: 999; width: 380px; max-width: calc(100vw - 48px); height: 520px; max-height: calc(100vh - 140px); background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border}; border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.12); display: flex; flex-direction: column; overflow: hidden; animation: chatSlideIn 0.35s cubic-bezier(0.22,1,0.36,1); }
        @keyframes chatSlideIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes chatDot { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
      `}</style>

      {/* Contact Quick Actions */}
      <button className="float-btn float-contact" onClick={() => { setContactOpen(!contactOpen); setChatOpen(false); }} aria-label="Contact Mel">
        <Phone size={22} />
      </button>

      {contactOpen && (
        <div className="contact-popup">
          <div style={{ fontSize: 12, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 16 }}>Quick Contact</div>
          <a href="tel:8082858774">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${BRAND.teal}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={16} color={BRAND.teal} /></div>
            <div><div style={{ fontWeight: 600 }}>Call Mel</div><div style={{ fontSize: 12, color: BRAND.textDim }}>(808) 285-8774</div></div>
          </a>
          <a href="mailto:mel@homesweethomehawaii.com">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${BRAND.gold}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Mail size={16} color={BRAND.gold} /></div>
            <div><div style={{ fontWeight: 600 }}>Email Mel</div><div style={{ fontSize: 12, color: BRAND.textDim }}>mel@homesweethome...</div></div>
          </a>
          <a href="https://www.instagram.com/mel.castanares" target="_blank" rel="noopener noreferrer">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${BRAND.coral}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Instagram size={16} color={BRAND.coral} /></div>
            <div><div style={{ fontWeight: 600 }}>Instagram</div><div style={{ fontSize: 12, color: BRAND.textDim }}>@mel.castanares</div></div>
          </a>
        </div>
      )}

      {/* AI Chat Button */}
      <button className={`float-btn float-chat ${chatOpen ? "open" : "float-pulse"}`} onClick={() => { setChatOpen(!chatOpen); setContactOpen(false); }} aria-label="Chat with AI assistant">
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {chatOpen && (
        <div className="chat-window">
          <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})`, color: "#fff", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <img src="/images/mel-headshot.jpg" alt="Mel" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>Ask Mel's AI</div><div style={{ fontSize: 11, opacity: 0.7 }}>Hawai'i real estate assistant</div></div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
                  ...(msg.role === "user" ? { background: BRAND.teal, color: "#fff", borderBottomRightRadius: 4 } : { background: BRAND.bgEl, color: BRAND.text, borderBottomLeftRadius: 4, border: `1px solid ${BRAND.border}` }),
                  fontSize: 13, lineHeight: 1.6, wordBreak: "break-word",
                }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "12px 18px", background: BRAND.bgEl, borderRadius: 14, borderBottomLeftRadius: 4, border: `1px solid ${BRAND.border}`, width: "fit-content" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.teal, animation: `chatDot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: "0 14px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["What neighborhoods?", "Down payment?", "About Mel"].map((q, i) => (
                <button key={i} onClick={() => setInput(q)} style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${BRAND.border}`, background: "transparent", color: BRAND.teal, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>{q}</button>
              ))}
            </div>
          )}

          <div style={{ padding: "10px 14px", borderTop: `1px solid ${BRAND.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about Hawai'i real estate..." style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${BRAND.border}`, background: BRAND.bgEl, color: BRAND.text, fontSize: 13, outline: "none", fontFamily: "'DM Sans'" }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: input.trim() ? BRAND.teal : BRAND.bgEl, color: input.trim() ? "#fff" : BRAND.textDim, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send size={15} />
            </button>
          </div>
          <div style={{ padding: "4px 14px 8px", textAlign: "center", fontSize: 10, color: BRAND.textDim }}>Powered by AI · Not a substitute for professional advice</div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// APP — ROUTER
// ─────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("home");

  // Scroll to top instantly on every page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [page]);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={setPage} />;
      case "properties": return <PropertiesPage setPage={setPage} />;
      case "property-detail": return <PropertyDetailPage setPage={setPage} />;
      case "about": return <AboutPage setPage={setPage} />;
      case "neighborhoods": return <NeighborhoodsPage />;
      case "market": return <MarketPage />;
      case "blog": return <BlogPage setPage={setPage} />;
      case "blog-post": return <BlogPostPage setPage={setPage} />;
      case "contact": return <ContactPage />;
      case "buyers": return <BuyersPage setPage={setPage} />;
      case "sellers": return <SellersPage setPage={setPage} />;
      case "valuation": return <ValuationPage />;
      case "mortgage": return <MortgageCalculatorPage setPage={setPage} />;
      case "relocation": return <RelocationPage setPage={setPage} />;
      case "testimonials": return <TestimonialsPage />;
      default: return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BRAND.bg, color: BRAND.text, fontFamily: "'DM Sans', sans-serif" }}>
      <GlobalStyles />
      <div className="grain" />
      <Nav page={page} setPage={setPage} />
      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>
      <Footer setPage={setPage} />
      
      {/* Floating Contact + Chat buttons */}
      <FloatingActions setPage={setPage} />
    </div>
  );
}
