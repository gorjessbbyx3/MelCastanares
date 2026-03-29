import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  getRentals:       ()           => apiFetch('/rentals'),
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
  instagram: "https://www.instagram.com/__mellio",
  instagramHandle: "@__mellio",
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

// No hardcoded properties — all listing data loads live from real sources.
// Rentals: Cloudflare Worker proxies AppFolio (dreamhomerlty.appfolio.com/listings/)
// For Sale: Dream Home Realty Hawaii MLS search (dreamhomerealtyhawaii.com/property-search)
const FALLBACK_PROPERTIES: any[] = [];

const FALLBACK_NEIGHBORHOODS = [
  { id: "mililani", name: "Mililani", tagline: "Mel's home turf · Best schools on O'ahu", description: "Central O'ahu's crown jewel — Mililani is a master-planned community built for families. Top-ranked schools, 15+ neighborhood parks, multiple rec centers with pools and waterslides, and HOA-maintained open spaces make it one of the most livable communities in the state. Easy H-2 freeway access puts downtown Honolulu 30 minutes away. Mel grew up in Central O'ahu and knows every street, school district, and park here.", longDesc: "Mililani is Central O'ahu's crown jewel — a master-planned community that was built with families in mind from the ground up, and it shows in every detail.\n\nSafety & Community: Low crime rates, tree-lined streets with sidewalks, and a strong suburban community vibe. Neighbors know each other. Kids ride bikes and walk to school. It feels the way neighborhoods are supposed to feel.\n\nTop-Rated Schools: Mililani High School consistently ranks among the best public high schools on O'ahu. Mililani Uka, Mililani Waena, and Mililani Mauka elementaries all feed into a strong pipeline that families plan their moves around.\n\nRecreation Like Nowhere Else: 15+ neighborhood parks, multiple community recreation centers, swimming pools with waterslides, tennis courts, jogging paths, and open green spaces. The rec centers are a huge draw — your kids will spend entire summers there.\n\nCooler & Greener: Sitting at roughly 600 feet elevation, Mililani stays noticeably cooler than Honolulu. The area is lush, planned with open spaces and greenery that make it feel like you're living inside a park.\n\nCentral Location: Quick H-2 freeway access to Honolulu (30 min), the North Shore (25 min), military bases, major shopping, and Waikele Premium Outlets. You're central to everything without being in the middle of the urban congestion.\n\nMaster-Planned with a Community Association: HOA maintains common areas, amenities, and neighborhood standards. That consistency is a big reason why Mililani holds its value so well — and why Mel recommends it to almost every family relocating to O'ahu.", coverImage: "https://www.wilkow.com/wp-content/uploads/2024/10/HI-Town-Center-of-Mililani-main_0-copy.webp", images: [{url: "https://www.wilkow.com/wp-content/uploads/2024/10/HI-Town-Center-of-Mililani-main_0-copy.webp", isPrimary: true}, {url: "https://i.imgur.com/QimGY.jpg", isPrimary: false}, {url: "https://i.imgur.com/r8Ig7.jpg", isPrimary: false}, {url: "https://i.imgur.com/a909V.jpg", isPrimary: false}, {url: "https://i.imgur.com/L9kYq.jpg", isPrimary: false}, {url: "https://i.imgur.com/Y8tIN.jpg", isPrimary: false}, {url: "https://i.imgur.com/mkVuG.jpg", isPrimary: false}, {url: "https://i.imgur.com/Aecsu.jpg", isPrimary: false}, {url: "https://i.imgur.com/PslwA.jpg", isPrimary: false}, {url: "https://i.imgur.com/Z0xyN.jpg", isPrimary: false}, {url: "https://i.imgur.com/ZKE15.jpg", isPrimary: false}], medianHomePrice: "$820K", growth: "+4.8%", highlights: ["Top-Rated Schools", "15+ Parks", "Rec Centers & Pools", "Family-Friendly", "Master-Planned", "Cooler Elevation", "Central O'ahu"], schools: "Mililani High School (top-ranked on O'ahu), Mililani Uka Elementary, Mililani Waena Elementary, Mililani Mauka Elementary, Mililani Middle School. All within the neighborhood — most kids can walk.", dining: "Mililani Shopping Center, Waikele Premium Outlets (10 min), Costco, Target, Times Supermarket, and a growing restaurant corridor along Kamehameha Hwy. Everything you need is within a 10-minute drive.", thingsToDo: "15+ neighborhood parks including Mililani District Park, 7 recreation centers with swimming pools, waterslides, tennis courts, and fitness facilities, jogging/biking paths throughout the community, easy freeway access to North Shore surf beaches, Pearl Harbor historic sites, and Waipio Valley lookout." },
  { id: "ewa-beach", name: "Ewa Beach / Kapolei", tagline: "O'ahu's fastest-growing 'second city'", description: "The west side is booming — and for good reason. Newer master-planned communities (Kapolei, Ho'opili), more affordable pricing, and a rapidly expanding infrastructure make Ewa Beach and Kapolei the best value on island right now. Beach parks, Ko Olina lagoons, Ka Makana Ali'i mall, and great schools — this is where savvy families are investing right now.", longDesc: "Ewa Beach and Kapolei represent the best opportunity in O'ahu real estate today — and Mel has the receipts to prove it.\n\nAffordable & Newer: More affordable housing than Honolulu or East O'ahu, with newer master-planned communities especially in Kapolei and Ho'opili. Homes often come with solar, modern features, and community pools and parks built in.\n\nFamily-Friendly Living: Plenty of parks, playgrounds, community centers, and outdoor activities designed for kids and active lifestyles. The suburban feel with low tourist crowds makes it a favorite for families putting down roots.\n\nBeach & Ocean Access: Direct access to beaches and shoreline parks — Ewa Beach Park, One'ula, Pu'uloa — for swimming, surfing, and relaxed days. Kapolei residents are minutes from the stunning Ko Olina lagoons, one of the most beautiful and calm swimming spots on the island.\n\nO'ahu's Second City: Growing infrastructure as O'ahu's designated Second City — modern shopping at Ka Makana Ali'i mall, restaurants, schools, and planned amenities are arriving fast. This isn't a sleepy suburb anymore.\n\nConvenient West-Side Location: Closer to military bases (Barbers Point, Schofield), easier commutes for many jobs, and future rail/transit access. Abundant green spaces, golf courses, and outdoor recreation round it out.\n\nSunny Weather Year-Round: Hot and dry on the west side — great for beach lovers. Mel's honest take: budget for A/C, but enjoy the fact that it almost never rains on your barbecue.", coverImage: "https://i.imgur.com/G32u1.jpg", images: [{url: "https://i.imgur.com/G32u1.jpg", isPrimary: true}, {url: "https://i.imgur.com/72ERD.jpg", isPrimary: false}, {url: "https://i.imgur.com/JdPyF.jpg", isPrimary: false}, {url: "https://i.imgur.com/KuUly.jpg", isPrimary: false}, {url: "https://i.imgur.com/ymXkN.jpg", isPrimary: false}, {url: "https://i.imgur.com/TkzIQ.jpg", isPrimary: false}, {url: "https://i.imgur.com/MXYui.jpg", isPrimary: false}, {url: "https://i.imgur.com/zx7hU.jpg", isPrimary: false}, {url: "https://i.imgur.com/OrcZJ.jpg", isPrimary: false}, {url: "https://i.imgur.com/SJk4H.jpg", isPrimary: false}, {url: "https://i.imgur.com/z8JQV.jpg", isPrimary: false}, {url: "https://i.imgur.com/Jl8Ly.jpg", isPrimary: false}, {url: "https://i.imgur.com/k5Ywd.jpg", isPrimary: false}, {url: "https://i.imgur.com/DVOgW.jpg", isPrimary: false}, {url: "https://i.imgur.com/wrUUz.jpg", isPrimary: false}, {url: "https://i.imgur.com/v1g20.jpg", isPrimary: false}, {url: "https://i.imgur.com/pZYvh.jpg", isPrimary: false}], medianHomePrice: "$780K", growth: "+6.2%", highlights: ["New Construction", "Ko Olina Lagoons", "Ka Makana Ali'i", "Beach Parks", "Family-Friendly", "Great Value", "Future Rail"], schools: "Kapolei High School, Ewa Makai Middle, Ewa Elementary, Ho'opili Elementary (new), and several charter options. Schools are growing and improving rapidly alongside the community.", dining: "Ka Makana Ali'i mall (O'ahu's newest regional mall), Target, Costco, Times Supermarket, Ewa Town Center, and a growing restaurant scene along Kapolei Parkway. Ko Olina Resort has world-class dining options nearby.", thingsToDo: "Ewa Beach Park, One'ula Beach Park, and Pu'uloa Beach for swimming and surfing. Ko Olina lagoons for calm ocean swimming. 'Ewa Mahiko District Park tennis and pickleball courts. Kapolei Regional Park playground. Golf at Ko Olina Golf Club or Kapolei Golf Course. Future rail access connecting the west side to Honolulu." },
  { id: "pearl-city", name: "Pearl City / Aiea", tagline: "Central O'ahu · Pearl Harbor views · Unbeatable access", description: "Sitting at the geographic heart of O'ahu, Pearl City and Aiea deliver the best commute, the biggest mall in Hawai'i, Pearl Harbor views from the hillsides, and solid schools — all at prices that still make sense. Mel specializes in this corridor and knows every building, every block, and every deal.", longDesc: "Pearl City and Aiea are where O'ahu's practical magic lives. Not flashy — just genuinely excellent places to build a life.\n\nCentral Location, Unmatched Access: Quick H-1/H-201 freeway access to Honolulu, Pearl Harbor, military bases, and further west. For military families and commuters, this is one of the most strategically located areas on the island. You can be almost anywhere in 20–30 minutes.\n\nShopping & Dining Right There: Pearlridge Center — Hawai'i's largest enclosed mall — anchors the area with everything from groceries to entertainment. Pearl City Shopping Center, restaurants, and service businesses fill in every gap. You don't need to drive far for anything.\n\nFamily-Friendly with Great Schools: Pearl City High School is consistently highly ranked. Abundant parks, playgrounds, community centers, and recreational facilities. Safe, tight-knit suburban communities with a notably low crime rate relative to urban Honolulu.\n\nHousing Variety: Established single-family homes in Aiea Heights and upper Pearl City often come with stunning Pearl Harbor and Ko'olau mountain views. Condos near Pearlridge for entry-level buyers. Well-maintained neighborhoods like Momilani and Pacific Palisades for families wanting yard space.\n\nHistory & Outdoors: The Aiea Loop Trail is one of the best intermediate hikes on O'ahu. Pearl Harbor historic sites — USS Arizona, USS Missouri, USS Oklahoma — are minutes away. Aiea Bay State Recreation Area and shoreline parks round out the outdoor options.\n\nMel's Take: This is where she sends first-time buyers who want real value without sacrificing quality. Condos from $350K–$600K; single-family from $750K+. The inventory moves fast — come prepared.", coverImage: "https://i.imgur.com/Vmv0Z.jpg", images: [{url: "https://i.imgur.com/Vmv0Z.jpg", isPrimary: true}, {url: "https://i.imgur.com/x0PWr.jpg", isPrimary: false}, {url: "https://i.imgur.com/77qCt.jpg", isPrimary: false}, {url: "https://i.imgur.com/0KHip.jpg", isPrimary: false}, {url: "https://i.imgur.com/KNyMY.jpg", isPrimary: false}, {url: "https://i.imgur.com/EJwwu.jpg", isPrimary: false}, {url: "https://i.imgur.com/x7xmG.jpg", isPrimary: false}], medianHomePrice: "$620K", growth: "+3.9%", highlights: ["Pearl Harbor Views", "Pearlridge Mall", "Pearl City High", "First-Time Buyers", "Military-Friendly", "Aiea Loop Trail", "Central O'ahu"], schools: "Pearl City High School (consistently top-ranked statewide), Pearl City Elementary, Momilani Elementary, Aiea High and Elementary. All within easy reach — many kids can walk or bike.", dining: "Pearlridge Center (Hawai'i's largest enclosed mall) with full dining options, Pearl City Shopping Center, Times Supermarket, and a dense corridor of restaurants along Kamehameha Highway. Every cuisine, every price point, all close by.", thingsToDo: "Aiea Loop Trail (one of O'ahu's best intermediate hikes), Pearl Harbor historic sites (USS Arizona Memorial, USS Missouri, USS Oklahoma), Aiea Bay State Recreation Area, Aloha Stadium events, Pearlridge Center, and easy freeway access to beaches on every side of the island." },
  { id: "kaneohe", name: "Kāne'ohe", tagline: "Kāne'ohe Bay · Ko'olau mountains · Windward living", description: "A larger, bay-focused windward community with stunning Kāne'ohe Bay waterfront, Ko'olau mountain backdrops, Windward Mall, and more affordable pricing than neighboring Kailua. Popular with families, military households, and anyone who wants dramatic natural beauty without the Kailua price tag.", longDesc: "Kāne'ohe doesn't get the hype Kailua does — and that's exactly why smart buyers go there.\n\nKāne'ohe Bay Access: Boating, sailing, fishing, and paddling on one of the most beautiful bays in the Pacific. The famous sandbar — a shallow reef in the middle of the bay where you can wade at low tide — is a weekend ritual for locals. He'eia Fishpond and State Park are right there.\n\nKo'olau Mountain Backdrop: The green, dramatic Ko'olau Range frames every view. Hiking is right out your back door. The drive over the Pali Highway into Honolulu is genuinely one of the most scenic commutes in the world.\n\nFamily-Oriented Neighborhoods: Parks, community centers, and good public schools. Safe, established neighborhoods with a strong sense of community. Quieter than central O'ahu but with solid local amenities at Windward Mall.\n\nMore Affordable Than Kailua: Single-family homes, condos, and waterfront properties available at meaningfully lower prices than Kailua — including options with marina access or bay views. Great for buyers who want windward living without the premium.\n\nMilitary-Friendly: MCB Hawaii (Marine Corps Base Hawai'i at Kāne'ohe Bay) is a major employer and community anchor. Many families choose Kāne'ohe specifically for proximity to the base.\n\nMel's Take: She has helped multiple families find both rental investments and primary homes here. The morning mist on the Ko'olaus and the drive over the Pali never get old.", coverImage: "https://i.imgur.com/WH1Gj.jpg", images: [{url: "https://i.imgur.com/WH1Gj.jpg", isPrimary: true}, {url: "https://i.imgur.com/AHOZe.jpg", isPrimary: false}, {url: "https://i.imgur.com/dXvAw.jpg", isPrimary: false}, {url: "https://i.imgur.com/6V2UF.jpg", isPrimary: false}, {url: "https://i.imgur.com/Kr5Of.jpg", isPrimary: false}, {url: "https://i.imgur.com/iQtX9.jpg", isPrimary: false}, {url: "https://i.imgur.com/0PXyL.jpg", isPrimary: false}, {url: "https://i.imgur.com/LzGI5.jpg", isPrimary: false}, {url: "https://i.imgur.com/TnyRN.jpg", isPrimary: false}], medianHomePrice: "$890K", growth: "+3.5%", highlights: ["Kāne'ohe Bay", "Ko'olau Mountains", "Kāne'ohe Sandbar", "More Affordable", "Military-Friendly", "Windward Side", "Boating & Sailing"], schools: "Kāne'ohe Elementary, King Intermediate, Castle High School (windward area), and Kailua High for parts of the community. Good public schools with a tight-knit feel. Several charter options nearby.", dining: "Windward Mall anchors the shopping and dining scene — restaurants, movie theater, and everyday conveniences. He'eia Kea Boat Harbor area has local spots, and Kailua town's restaurant scene is just minutes away for a night out.", thingsToDo: "Kāne'ohe Bay boating, fishing, and sandbar wading. He'eia State Park and fishpond. Ko'olau Golf Course. Hoomaluhia Botanical Garden (one of the most beautiful on O'ahu). Kayaking in the bay. Marine Corps Base events. Easy tunnel access to Kailua beaches and Honolulu." },
  { id: "kailua", name: "Kailua", tagline: "Kailua Beach · Lanikai · Windward paradise", description: "Consistently ranked among the world's best beaches — Kailua Beach Park and Lanikai define the town. Boutique shops, farm-to-table restaurants, great schools, and a breezy windward climate. High demand keeps prices strong, but for buyers who want the real Hawai'i, there's nowhere quite like it.", longDesc: "Kailua is the answer to 'where would you actually want to live if you moved to Hawai'i.'\n\nWorld-Famous Beaches: Kailua Beach Park and Lanikai consistently rank among the world's best. Soft white sand, turquoise water, and the two Mokulua Islands sitting perfectly offshore. Kayaking, paddleboarding, kitesurfing, and morning swims are just part of daily life here.\n\nVibrant Town Center: Boutique shops, restaurants, cafes, and farmers markets line the main streets. It's walkable, charming, and actually local — not a tourist strip. Kailua has managed to stay itself despite everyone wanting to move here.\n\nOutdoor Recreation Everywhere: The Ko'olau mountains rise dramatically behind the town. Hiking, biking, and trails are right there. The breezy windward climate keeps everything lush and green — more rain than the leeward side, but your yard will thank you.\n\nFamily-Friendly and Safe: Good schools, parks, community events, and a neighborhood vibe that feels small-town despite being a major destination. Young families, professionals, and long-time locals all mix here comfortably.\n\nHousing Range: Oceanfront luxury with direct bay access, single-family homes with mountain or ocean views, and established inland neighborhoods. The inventory is tight — quality homes move fast.\n\nMel's Honest Note: Honolulu is 30–45 minutes away via the Pali or Likelike Highway. Commutes can stack in traffic. But if your lifestyle is built around the water and the outdoors, the math usually works in Kailua's favor.", coverImage: "https://i.imgur.com/kRv6x.jpg", images: [{url: "https://i.imgur.com/kRv6x.jpg", isPrimary: true}, {url: "https://i.imgur.com/JERZb.jpg", isPrimary: false}, {url: "https://i.imgur.com/C43KU.jpg", isPrimary: false}, {url: "https://i.imgur.com/VYKxO.jpg", isPrimary: false}, {url: "https://i.imgur.com/4P8cr.jpg", isPrimary: false}, {url: "https://i.imgur.com/ptMIB.jpg", isPrimary: false}, {url: "https://i.imgur.com/YlaoC.jpg", isPrimary: false}, {url: "https://i.imgur.com/lstio.jpg", isPrimary: false}], medianHomePrice: "$1.4M", growth: "+6.1%", highlights: ["Kailua Beach Park", "Lanikai Beach", "Mokulua Islands", "Boutique Town", "Ko'olau Hiking", "Family-Friendly", "Kayaking & Paddleboarding"], schools: "Kailua Elementary, Kailua Intermediate, and Kailua High School — all solid public schools with strong community involvement. Several private school options nearby in the windward area.", dining: "Kailua town is a food destination — Kalapawai Market & Café, Buzz's Steakhouse (a Kailua institution), Cinnamon's at the Ilima, Sweetcakes, Morning Brew, and a rotating roster of farm-to-table spots. A weekly farmers market adds fresh local produce year-round.", thingsToDo: "Kailua Beach Park and Lanikai Beach swimming and sunsets. Kayaking to the Mokulua Islands. Paddleboarding, kitesurfing, and outrigger canoe paddling. Ko'olau hiking trails (Lanikai Pillbox, Maunawili Falls). Biking the neighborhood paths. Popping into the boutique shops and picking up shave ice on the way home." },
  { id: "kaimuki", name: "Kaimuki", tagline: "Diamond Head backdrop · Best food in Honolulu", description: "A walkable, hip urban neighborhood behind Diamond Head with Honolulu's most beloved local food scene, plantation-style homes with character, and fast access to beaches, hiking, and downtown — without any of the Waikiki tourist noise.", longDesc: "Kaimuki is Honolulu's best-kept open secret. It has what most Honolulu neighborhoods want but can't quite pull off: walkability, personality, and food worth driving across the island for.\n\nWalkable Town Center: Waialae Avenue and the surrounding streets are lined with excellent local restaurants, cafes, boutiques, and spots that locals actually love. 12th Ave Grill, Mud Hen Water, Koko Head Cafe, and a rotating roster of new openings keep it fresh. Everything is in reach without a car.\n\nCentral Honolulu Location: Quick access to Waikiki, Diamond Head, beaches, hiking trails, and downtown. Many residents are under 20 minutes from anywhere they need to be on the island.\n\nHousing with Character: Older plantation-style homes with charm, some with Diamond Head or ocean views, plus a mix of single-family and multi-unit options. These aren't cookie-cutter — every block has a different personality.\n\nOutdoor Access Without Leaving the Neighborhood: Diamond Head Crater trail is minutes away. Kahala Beach and Kaimana Beach are a short drive. Biking, surfing, and hiking are part of the weekly routine here.\n\nFamily-Friendly and Dog-Friendly: Good public schools, parks, playgrounds, and a community feel that punches well above its urban zip code. The vibe is 'small town inside the city' — and it holds up.\n\nMel's Take: Strong appreciation history and tight inventory make Kaimuki one of the best buy-and-hold neighborhoods in Honolulu. If you can get in, get in.", coverImage: "https://i.imgur.com/GS9O9.jpg", images: [{url: "https://i.imgur.com/GS9O9.jpg", isPrimary: true}, {url: "https://i.imgur.com/6dogo.jpg", isPrimary: false}, {url: "https://i.imgur.com/whbJZ.jpg", isPrimary: false}, {url: "https://i.imgur.com/D9MJO.jpg", isPrimary: false}, {url: "https://i.imgur.com/6WLE3.jpg", isPrimary: false}, {url: "https://i.imgur.com/Asbq2.jpg", isPrimary: false}, {url: "https://i.imgur.com/CbNIF.jpg", isPrimary: false}], medianHomePrice: "$985K", growth: "+4.2%", highlights: ["Diamond Head Views", "Best Food Scene", "Walkable", "Central Honolulu", "Local Character", "Strong Appreciation", "Beach Access"], schools: "Kaimuki High School, Liholiho Elementary, and several Honolulu district options. Strong DOE schools with the added benefit of being near multiple private school alternatives in East Honolulu.", dining: "The best local food street in Honolulu — 12th Ave Grill, Mud Hen Water, Koko Head Cafe, Ono Seafood, Gindaco Takoyaki, and new spots opening constantly. Farmers market access and a walk-to-everything food lifestyle that few Honolulu neighborhoods can match.", thingsToDo: "Diamond Head Crater hike (one of O'ahu's most iconic). Kaimana Beach (locals' favorite in-town beach). Kahala Mall shopping. Surfing at Ala Moana. Biking the Diamond Head area. Weekend brunches, coffee shop hopping, and exploring the rotating restaurant scene on Waialae Ave." },
  { id: "hawaii-kai", name: "Hawai'i Kai", tagline: "Marina living · Koko Head · East O'ahu gem", description: "A master-planned coastal community in East O'ahu with a full marina, waterfront homes with docks, stunning lagoons, Koko Head Crater right out back, and Sandy Beach a few minutes away. Suburban peace, ocean access, and 20–30 minutes to Honolulu.", longDesc: "Hawai'i Kai is the kind of neighborhood that people discover, fall in love with, and then never leave. Mel's bold take: it's the most undervalued community on O'ahu right now — and the fundamentals back that up.\n\nMarina & Waterfront Living: The Hawai'i Kai Marina is the anchor of the neighborhood — boating, paddling, fishing, and scenic lagoons right in your backyard. Many homes have docks or direct water access. This is a lifestyle most people pay far more for elsewhere.\n\nFamily-Friendly and Safe: Top-rated public schools, parks, playgrounds, and master-planned communities designed with families in mind. Strong community bonds and a notably safe, suburban feel despite being part of greater Honolulu.\n\nCoastal Lifestyle Built In: Sandy Beach is minutes away — one of the most powerful shore break beaches on the island. Hanauma Bay snorkeling, Makapu'u Point lighthouse hike, and the entire East O'ahu coastline are right there. Koko Head Crater Stairs — one of O'ahu's most punishing and rewarding workouts — is your local trail.\n\nConvenient Local Amenities: Hawai'i Kai Shopping Center covers groceries, dining, and services. You can genuinely live, shop, and play mostly within the neighborhood, which is rare for a coastal community.\n\nHousing Mix: Single-family homes, townhomes, and condos — many with solar, modern features, and ocean or Koko Head views. Marina-front properties with docks command premium prices, but value exists throughout the community.\n\nProximity to Honolulu: About 20–30 minutes to downtown via Kalanianaole Highway. The drive in along the coast past Sandy Beach and Hanauma Bay might be the most scenic commute on the island.", coverImage: "https://i.imgur.com/wPu6d.jpg", images: [{url: "https://i.imgur.com/wPu6d.jpg", isPrimary: true}, {url: "https://i.imgur.com/rCavw.jpg", isPrimary: false}, {url: "https://i.imgur.com/InDer.jpg", isPrimary: false}, {url: "https://i.imgur.com/FUmet.jpg", isPrimary: false}, {url: "https://i.imgur.com/eCGpS.jpg", isPrimary: false}, {url: "https://i.imgur.com/k6hvM.jpg", isPrimary: false}, {url: "https://i.imgur.com/AIYWk.jpg", isPrimary: false}], medianHomePrice: "$1.3M", growth: "+4.7%", highlights: ["Marina & Docks", "Koko Head Crater", "Sandy Beach", "Family-Friendly", "Waterfront Homes", "Hanauma Bay", "Undervalued Gem"], schools: "Hahaione Elementary, Niu Valley Middle, Kaiser High School — consistently strong public schools in the East Honolulu complex. Safe, well-resourced, and community-connected.", dining: "Hawai'i Kai Shopping Center has everything from Foodland to local restaurants and cafes. Koko Marina Center adds more dining options right on the water. For a special night, the drive along the coast to Kaimuki or Aina Haina restaurants is quick and scenic.", thingsToDo: "Koko Head Crater Stairs (O'ahu's most intense urban hike). Sandy Beach bodysurfing and shore break. Hanauma Bay snorkeling (one of the best in the state). Makapu'u Point lighthouse trail. Boating and paddling in the marina. Hawaii Kai Golf Course. Sunset cruises and kayaking in the lagoons." },
  { id: "north-shore", name: "North Shore", tagline: "Surf culture · Laid-back coastal living", description: "Home to legendary surf breaks (Pipeline, Sunset Beach, Waimea Bay), a tight-knit Haleiwa town scene, and some of the most dramatic coastline on the planet. Low inventory keeps prices competitive. For buyers seeking a completely different — and unforgettable — pace of island life.", longDesc: "The North Shore is O'ahu's soul. If you've ever driven through Haleiwa on a quiet Tuesday morning with a shave ice in hand and the smell of the ocean everywhere, you already know what I mean.\n\nWorld-Class Ocean Access: Pipeline, Sunset Beach, and Waimea Bay are literally your neighborhood beaches. In winter you're watching the best surfers on earth from your backyard. In summer the water goes calm and clear — perfect for snorkeling and paddleboarding. This is what people move to Hawai'i for.\n\nSmall-Town Community Feel: Haleiwa is a real town. Local shops, restaurants, coffee spots, and a tight surf-and-farm community that looks out for each other. You'll know your neighbors. You'll have a regular table somewhere.\n\nNatural Surroundings: Lush mountains, green valleys, and dramatic coastlines. Hiking trails, waterfall chases, and farm stands selling the freshest produce on the island. The Polynesian Cultural Center is minutes away.\n\nHousing Options: A mix of beachfront cottages, hillside homes with ocean views, and more spacious rural properties. Many homes have land — something increasingly rare on O'ahu.\n\nMel's Honest Take: Commutes to Honolulu are long (45 min to 1+ hour depending on traffic). Big-box shopping requires a drive. Cell signal can be spotty. But for the right buyer — and Mel can help you figure out if that's you — there is nowhere else on earth quite like this.", coverImage: "https://i.imgur.com/08gxh.jpg", images: [{url: "https://i.imgur.com/08gxh.jpg", isPrimary: true}, {url: "https://i.imgur.com/kfzFn.jpg", isPrimary: false}, {url: "https://i.imgur.com/S9zja.jpg", isPrimary: false}, {url: "https://i.imgur.com/WmXnD.jpg", isPrimary: false}, {url: "https://i.imgur.com/aKuMb.jpg", isPrimary: false}, {url: "https://i.imgur.com/YpGJB.jpg", isPrimary: false}, {url: "https://i.imgur.com/iVGxM.jpg", isPrimary: false}, {url: "https://i.imgur.com/DMLfO.jpg", isPrimary: false}, {url: "https://i.imgur.com/lHWnz.jpg", isPrimary: false}, {url: "https://i.imgur.com/Yn8lj.jpg", isPrimary: false}, {url: "https://i.imgur.com/wiaTM.jpg", isPrimary: false}, {url: "https://i.imgur.com/e08LB.jpg", isPrimary: false}, {url: "https://i.imgur.com/MqavY.jpg", isPrimary: false}, {url: "https://i.imgur.com/8QiUl.jpg", isPrimary: false}, {url: "https://i.imgur.com/9VbYh.jpg", isPrimary: false}, {url: "https://i.imgur.com/yTM2t.jpg", isPrimary: false}], medianHomePrice: "$1.1M", growth: "+5.3%", highlights: ["Pipeline & Sunset Beach", "Waimea Bay", "Haleiwa Town", "Small-Town Vibe", "Beachfront Homes", "Lush Mountains", "Low Inventory"], schools: "Haleiwa Elementary, Waialua High & Intermediate, and Kahuku High School (serving the broader North Shore area). Smaller schools with tight-knit communities. Many families supplement with activities and programs on the central or west side.", dining: "Haleiwa is a food destination in its own right — Giovanni's Shrimp Truck, Matsumoto's Shave Ice, Kua 'Aina Burger, Haleiwa Joe's, and an ever-growing roster of local cafes and farm-to-table restaurants. Farmers markets and roadside fruit stands year-round.", thingsToDo: "Surfing at Pipeline, Sunset Beach, and Waimea Bay. Snorkeling and swimming at Shark's Cove and Three Tables. Hiking in the Waimea Valley. The Polynesian Cultural Center. Farm tours and stand-up paddleboarding. Shrimp truck road trips. Seasonal big-wave watching in winter — an experience unlike anything else on earth." },
];

const FALLBACK_TESTIMONIALS = [
  { clientName: "First-Time Renter", quote: "This was the first time renting a house on my own so I was really skeptical on which company to go with. I put my trust in Tori and Mel and they made the entire process smooth and easy. Although it was my first-time renting, they made me feel safe and explained everything I needed to know. Anytime I've had a problem or concern they were able to get back to me right away! In the future I will put my trust back with them as I make my first home purchase!", rating: 5, transactionType: "bought", featured: true },
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
  { id: "7", slug: "first-time-homebuyer-checklist-oahu-families", title: "First-Time Homebuyer Checklist for O'ahu Families", excerpt: "Buying your first home in Hawai'i is one of the most exciting — and complicated — things you'll ever do. From VA loans to leasehold land, association dues to termite inspections, here's the complete checklist I walk every first-time buyer through before they make an offer.", category: "First-Time Buyers", date: "Mar 18, 2026", readTime: 8, images: [{url: "/images/testimonial-sold.jpg", isPrimary: true}], featured: false,
    content: `Buying your first home in Hawai'i is different from anywhere else in the country — and in the best possible way. But it comes with its own unique set of hurdles. After helping dozens of first-time buyers find their footing on O'ahu, here's the checklist I use with every single client.\n\n**1. Get Pre-Approved (Not Just Pre-Qualified)**\nPre-qualification is a five-minute phone call. Pre-approval is what actually gets your offer accepted. Sellers on O'ahu — especially in competitive markets like Mililani and Ewa Beach — won't even look at your offer without a solid pre-approval letter from a reputable lender.\n\n**2. Understand Fee Simple vs. Leasehold**\nThis trips up almost every mainland buyer. Fee simple means you own the land. Leasehold means you're renting the land from someone else, often the state or a trust. Leasehold properties are cheaper upfront — but the lease expiration can make financing nearly impossible and resale value unpredictable.\n\n**3. Budget for Closing Costs (They're Higher Here)**\nExpect 2–4% of your purchase price in closing costs on top of your down payment. Hawaii has additional fees including conveyance taxes and title insurance that aren't common on the mainland.\n\n**4. Don't Skip the Termite Inspection**\nIn Hawai'i, termites aren't an "if" — they're a "when." Get a full termite and pest inspection, and factor treatment costs into your offer negotiations.\n\n**5. Know Your School Zones**\nIf you have kids (or plan to), school district boundaries are sacred in Hawai'i. Mililani, Kailua, and Kāne'ohe have some of the state's highest-ranked schools — and homes in their zones carry a premium. I can map out exact boundary lines for you.\n\n**6. Factor in HOA Dues**\nMany O'ahu condos and planned communities (like Mililani) have monthly HOA dues that range from $200 to $1,200+. These affect your debt-to-income ratio and your monthly budget.\n\nReady to start? [Contact Mel](/contact) for a free first-time buyer consultation — no pressure, just clarity.`
  },
  { id: "8", slug: "mililani-vs-kailua-schools-beaches-lifestyle", title: "Mililani vs. Kailua: Real Talk on Schools, Beaches, and Lifestyle", excerpt: "Two of O'ahu's best neighborhoods for families — but they couldn't be more different. One is a master-planned inland community with unbeatable schools. The other is a beach town with a charming local vibe and world-class surf. Which one's right for your family?", category: "Neighborhood Deep Dive", date: "Mar 10, 2026", readTime: 10, images: [{url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80", isPrimary: true}], featured: false,
    content: `When families ask me where to plant roots on O'ahu, Mililani and Kailua come up almost every single time. Both are incredible. Both are competitive. And they attract completely different types of buyers.\n\n**MILILANI: The Planned Community Champion**\n- Median home price: ~$820K (single-family) | ~$550K (townhome)\n- Top schools: Mililani High (#1 in state multiple years), Mililani Uka Elementary, Mililani Middle\n- Parks: 23 community parks, 7 rec centers, aquatic complex\n- Commute to Honolulu: 30–40 min via H-2/H-1\n- Vibe: Safe, walkable, master-planned, family-first\n- Best for: Families prioritizing schools, community, and value\n\n**KAILUA: The Beach Town Dream**\n- Median home price: ~$1.4M\n- Top schools: Kailua High, Lanikai Elementary (strong DOE ratings)\n- Beaches: Kailua Beach (top 5 in the US), Lanikai, Kalama Beach Park\n- Commute to Honolulu: 30–40 min over the Pali (or longer in traffic)\n- Vibe: Active, beachy, independent shops, local dining culture\n- Best for: Buyers prioritizing beach lifestyle, walkability, and long-term appreciation\n\n**The Honest Verdict**\nIf your family has school-age kids and you're watching your budget, Mililani gives you more home for your money and arguably the best public school system on island. If you can stretch the budget and want your weekends to feel like a vacation, Kailua is worth every penny.\n\nI've helped families buy in both — and I'll give you the unfiltered truth about which one fits your life. [Let's talk.](/contact)`
  },
  { id: "9", slug: "oahu-market-update-march-2026", title: "What's Really Happening in the O'ahu Market Right Now (March 2026 Update)", excerpt: "Inventory is climbing. Days on market are stretching. And buyers who were priced out two years ago are quietly writing offers again. Here's my honest read on where the O'ahu market stands right now — with actual data, no spin.", category: "Market Intelligence", date: "Mar 27, 2026", readTime: 7, images: [{url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80", isPrimary: true}], featured: false,
    content: `Every agent you talk to will tell you it's a great time to buy or sell. I'll tell you what's actually happening.\n\n**The Numbers (March 2026)**\n- Median single-family home price: $1.07M (+2.1% year-over-year)\n- Active listings: up 22% vs. March 2025\n- Median days on market: 22 days (up from 18 last year)\n- Price reductions: 31% of listings had at least one reduction\n- Mortgage rate environment: 30-year fixed hovering 6.4–6.9%\n\n**What This Means for Buyers**\nFor the first time in several years, you have actual leverage. More inventory means more choices. More days on market means sellers are negotiating. Price reductions mean the "list at anything and see what sticks" era is over. If you're pre-approved and patient, right now is genuinely one of the better entry windows O'ahu has seen since 2020.\n\n**What This Means for Sellers**\nThe days of listing on Thursday and going under contract by Sunday at $80K over ask? Mostly over (with some exceptions in hot micro-markets like Mililani and Kailua). The sellers winning right now are pricing accurately from day one, investing in professional photography, and doing strategic staging. Overpriced listings are sitting — and price reductions signal weakness to savvy buyers.\n\n**My Neighborhood-by-Neighborhood Read**\n- **Mililani**: Still a seller's market. Inventory tight, demand from families relentless.\n- **Ewa Beach/Kapolei**: Slight buyer advantage emerging. New builds adding supply.\n- **Kailua**: Premium holds. Anything under $1.2M moves fast.\n- **Kaimuki**: Appreciating steadily. Food-and-lifestyle buyers creating consistent demand.\n- **Hawai'i Kai**: Watch this one. Still underpriced relative to its amenities.\n\nHave questions about your specific situation? [Let's talk.](/contact)`
  },
  { id: "10", slug: "hidden-costs-buying-hawaii-most-people-miss", title: "Hidden Costs of Buying in Hawaii Most People Miss", excerpt: "The sticker price of your O'ahu home is just the beginning. Between closing costs, hurricane insurance, special assessments, and the true cost of island living, most buyers are surprised by how much more cash they need at the table. I break it all down.", category: "Buyer Reality Check", date: "Mar 3, 2026", readTime: 9, images: [{url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80", isPrimary: true}], featured: false,
    content: `I've sat across the table from dozens of buyers who came to O'ahu with their down payment ready — and then got blindsided by costs they didn't see coming. Here's the full honest breakdown.\n\n**1. Closing Costs: Budget 2–4%**\nOn a $800K home, that's $16,000–$32,000 in addition to your down payment. Hawai'i's conveyance tax (excise tax on real estate transfers) alone can add $2,000–$5,000 depending on the purchase price.\n\n**2. Hurricane Insurance (Yes, It's Separate)**\nStandard homeowner's insurance in Hawai'i does NOT cover hurricane damage. You need a separate hurricane policy, which typically costs $800–$2,500/year depending on your home, location, and construction type. It's not optional — your lender will require it.\n\n**3. HOA and Maintenance Fees**\nCondos in Honolulu can carry monthly maintenance fees from $300 to $1,500+. These cover building upkeep, amenities, and reserves — but "special assessments" (unexpected major repair costs) can hit without warning and cost thousands more.\n\n**4. Pest Control and Termite Warranties**\nAnnual contracts run $300–$600/year. If a property needs treatment, budget $1,000–$5,000 for fumigation. In Hawai'i, this is just cost of ownership.\n\n**5. The Leasehold Trap**\nLeasehold properties look like a bargain — until you realize you don't own the land, the lease could expire, and banks often won't finance them. Always check leasehold vs. fee simple before falling in love with a listing.\n\n**6. Island Shipping Premiums**\nEverything costs more here — from groceries to contractor labor. Budget 15–25% more for any home improvement project than you would on the mainland.\n\nWant a full cost breakdown personalized for your target neighborhood and price range? [Reach out](/contact) — I do this walkthrough for free with every buyer I work with.`
  },
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
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!visible || hasAnimated || isNaN(numEnd)) return;
    setHasAnimated(true);
    let start = 0;
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
// MAGNETIC TILT CARD — premium 3D hover effect
// ─────────────────────────────────────────────

function MagneticCard({ children, className = "", style = {}, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const tiltX = ((y - cy) / cy) * -6;
    const tiltY = ((x - cx) / cx) * 6;
    el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02) translateY(-6px)`;
    el.style.boxShadow = `${-tiltY * 2}px ${tiltX * 2}px 40px rgba(0,0,0,0.12), 0 0 0 1px ${BRAND.gold}18`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)";
    el.style.boxShadow = "";
  }, []);
  return (
    <div ref={ref} className={className} style={{ transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s", willChange: "transform", ...style }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onClick={onClick}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES (injected via style tag)
// ─────────────────────────────────────────────

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root, #__next { background: ${BRAND.bg} !important; color: ${BRAND.text} !important; }
    html { scroll-behavior: smooth; }
    body { font-family: 'DM Sans', sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: ${BRAND.teal}33; color: ${BRAND.teal}; }

    .font-display { font-family: 'DM Serif Display', serif; }
    .font-body { font-family: 'DM Sans', sans-serif; }

    .gold-text { color: ${BRAND.teal}; }
    .gold-gradient {
      background: linear-gradient(135deg, ${BRAND.goldDark}, ${BRAND.gold}, ${BRAND.goldLight}, ${BRAND.gold});
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    /* ── GRAIN OVERLAY ── */
    .grain { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; opacity: 0.028; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }

    /* ── LIQUID SHIMMER (premium card sheen) ── */
    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(115deg, transparent 40%, rgba(212,168,83,0.07) 50%, transparent 60%);
      background-size: 200% 100%;
      animation: liquidShimmer 4s ease-in-out infinite;
    }
    @keyframes liquidShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── MAGNETIC HOVER (cards lift + glow) ── */
    .card-hover { transition: transform 0.55s cubic-bezier(0.22,1,0.36,1), box-shadow 0.55s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
    .card-hover:hover {
      transform: translateY(-10px) scale(1.01);
      box-shadow: 0 28px 60px rgba(0,0,0,0.13), 0 0 0 1px ${BRAND.gold}22, 0 8px 30px ${BRAND.teal}10;
    }

    /* ── IMAGE KENBURNS ZOOM ── */
    .img-zoom { overflow: hidden; }
    .img-zoom img { transition: transform 1.8s cubic-bezier(0.22,1,0.36,1); transform-origin: center; }
    .img-zoom:hover img { transform: scale(1.1) rotate(0.5deg); }

    /* ── NAV LINK UNDERLINE ── */
    .nav-link { position: relative; }
    .nav-link::after {
      content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px;
      background: linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold});
      transition: width 0.45s cubic-bezier(0.22,1,0.36,1);
    }
    .nav-link:hover::after, .nav-link.active::after { width: 100%; }

    /* ── RIPPLE BUTTON ── */
    .btn-primary {
      display: inline-flex; align-items: center; justify-content: center; padding: 14px 32px;
      background: ${BRAND.teal}; color: #FFFFFF; font-family: 'DM Sans', sans-serif;
      font-weight: 600; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;
      border: none; cursor: pointer; position: relative; overflow: hidden;
      transition: background 0.4s, transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s;
    }
    .btn-primary:hover { background: ${BRAND.tealLight}; transform: translateY(-2px); box-shadow: 0 10px 36px ${BRAND.teal}40; }
    .btn-primary:active { transform: scale(0.97); }
    .btn-primary .ripple-circle {
      position: absolute; border-radius: 50%; background: rgba(255,255,255,0.25);
      transform: scale(0); animation: rippleOut 0.7s linear;
      pointer-events: none;
    }
    @keyframes rippleOut { to { transform: scale(4); opacity: 0; } }

    .btn-outline {
      display: inline-flex; align-items: center; justify-content: center; padding: 14px 32px;
      background: transparent; color: ${BRAND.teal}; font-family: 'DM Sans', sans-serif;
      font-weight: 600; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;
      border: 1px solid ${BRAND.teal}55; cursor: pointer;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1); position: relative; overflow: hidden;
    }
    .btn-outline::before {
      content: ''; position: absolute; inset: 0;
      background: ${BRAND.teal}; transform: scaleX(0); transform-origin: right;
      transition: transform 0.45s cubic-bezier(0.22,1,0.36,1);
    }
    .btn-outline:hover { color: #fff; border-color: ${BRAND.teal}; }
    .btn-outline:hover::before { transform: scaleX(1); transform-origin: left; }
    .btn-outline > * { position: relative; z-index: 1; }

    /* ── SECTION PADDING ── */
    .section-pad { padding: 100px 24px; max-width: 1400px; margin: 0 auto; }
    @media(min-width:768px) { .section-pad { padding: 120px 48px; } }
    @media(min-width:1024px) { .section-pad { padding: 140px 64px; } }

    /* ── QUICK LINKS BAR — mobile stacks ── */
    @media(max-width:640px) { .ql-bar { grid-template-columns: 1fr !important; } .ql-bar button { border-right: none !important; border-bottom: 1px solid var(--border); } }

    /* ── NEIGHBORHOOD SHOWCASE — mobile ── */
    @media(max-width:768px) {
      .nh-split { flex-direction: row !important; }
      .nh-list {
        width: 108px !important; min-width: 108px !important; max-width: 108px !important;
        flex-shrink: 0 !important;
        overflow-x: hidden !important; overflow-y: auto !important;
        display: flex !important; flex-direction: column !important;
        border-right: 1px solid var(--border);
      }
      .nh-list button {
        padding: 14px 10px !important;
        min-width: unset !important; white-space: normal !important;
        border-right: none !important;
        border-left: 3px solid transparent !important;
        border-bottom: 1px solid var(--border) !important;
        font-size: 12px !important;
        text-align: left !important;
      }
      .nh-list button[data-active="true"] {
        border-left: 3px solid ${BRAND.gold} !important;
      }
      .nh-tagline { display: none !important; }
      .nh-img { min-height: 360px !important; }
    }

    /* ── MEET MEL — mobile stacks ── */
    @media(max-width:768px) { .mel-split { grid-template-columns: 1fr !important; } }

    /* ── NEIGHBORHOOD DETAIL CARD — mobile ── */
    @media(max-width:700px) { .nh-detail-grid { grid-template-columns: 1fr !important; } }

    /* ── AI VALUATION LOADING BAR ── */
    @keyframes loadSlide { 0% { width: 0%; } 85% { width: 92%; } 100% { width: 100%; } }
    .ai-loading-bar { animation: loadSlide 2.5s cubic-bezier(0.4,0,0.2,1) forwards; height: 100%; background: linear-gradient(90deg, ${BRAND.goldDark}, ${BRAND.gold}, ${BRAND.goldLight}); border-radius: 2px; }

    /* ── INPUTS ── */
    .input-custom {
      width: 100%; background: ${BRAND.bgCard}; border: none;
      border-bottom: 1px solid ${BRAND.border}; padding: 14px 16px;
      color: ${BRAND.text}; font-family: 'DM Sans', sans-serif; font-size: 14px;
      outline: none; transition: border-color 0.35s;
    }
    .input-custom:focus { border-bottom-color: ${BRAND.gold}; }
    .input-custom::placeholder { color: ${BRAND.textDim}; }
    select.input-custom option { background: ${BRAND.bgCard}; color: ${BRAND.text}; }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    /* ── FLOATING PARTICLES (hero decoration) ── */
    .particle {
      position: absolute; border-radius: 50%; pointer-events: none;
      background: radial-gradient(circle, ${BRAND.gold}60, transparent 70%);
      animation: particleDrift var(--dur, 12s) ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }
    @keyframes particleDrift {
      0%,100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.4; }
      33% { transform: translateY(-30px) translateX(15px) scale(1.1); opacity: 0.7; }
      66% { transform: translateY(-15px) translateX(-20px) scale(0.9); opacity: 0.3; }
    }

    /* ── WAVE FLOAT (decorative SVG) ── */
    @keyframes waveFloat {
      0%,100% { transform: translateX(0) translateY(0) scaleX(1); }
      33% { transform: translateX(12px) translateY(-6px) scaleX(1.01); }
      66% { transform: translateX(-8px) translateY(-10px) scaleX(0.99); }
    }

    /* ── ORBS (abstract background blobs) ── */
    .orb {
      position: absolute; border-radius: 50%; pointer-events: none; filter: blur(80px);
      animation: orbPulse var(--dur, 10s) ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }
    @keyframes orbPulse {
      0%,100% { transform: scale(1) translate(0,0); opacity: 0.35; }
      50% { transform: scale(1.15) translate(20px,-10px); opacity: 0.55; }
    }

    /* ── MAGNETIC STATS CARD ── */
    .stat-card {
      transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s;
      cursor: default;
    }
    .stat-card:hover {
      transform: translateY(-6px) scale(1.03);
      box-shadow: 0 16px 40px rgba(26,138,125,0.15), 0 0 0 1px ${BRAND.teal}22;
    }

    /* ── TEXT CURSOR BLINK ── */
    .cursor-blink::after { content: '|'; animation: blink 1.1s step-end infinite; }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

    /* ── HERO ENTRANCE ── */
    .hero-text-anim {
      animation: heroEntrance 1.4s cubic-bezier(0.22,1,0.36,1) both;
      animation-fill-mode: both;
    }
    .hero-text-anim-d1 { animation-delay: 0.15s; }
    .hero-text-anim-d2 { animation-delay: 0.4s; }
    .hero-text-anim-d3 { animation-delay: 0.7s; }
    .hero-text-anim-d4 { animation-delay: 1.0s; }
    @keyframes heroEntrance {
      from { opacity: 0; transform: translateY(40px) skewY(1deg); filter: blur(4px); }
      to   { opacity: 1; transform: translateY(0) skewY(0deg); filter: blur(0px); }
    }

    /* ── FADE IN UP (general) ── */
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

    /* ── FLOAT (scroll indicator) ── */
    .float { animation: floatY 2.8s ease-in-out infinite; }
    @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

    /* ── GLOW PULSE (stat cards, CTAs) ── */
    .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
    @keyframes glowPulse {
      0%,100% { box-shadow: 0 0 0 0 ${BRAND.teal}00; }
      50% { box-shadow: 0 0 28px 6px ${BRAND.teal}28; }
    }

    /* ── STAGGER LINE (horizontal reveal bar) ── */
    .line-reveal-h {
      position: relative; overflow: hidden;
    }
    .line-reveal-h::before {
      content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 0;
      background: linear-gradient(90deg, ${BRAND.teal}20, transparent);
      animation: lineRevealH 1.5s cubic-bezier(0.22,1,0.36,1) forwards;
      animation-delay: 0.3s;
    }
    @keyframes lineRevealH { to { width: 100%; } }

    /* ── MOBILE MENU ── */
    .hidden-mobile { display: flex !important; }
    .show-mobile { display: none !important; }
    @media(max-width:1024px) {
      .hidden-mobile { display: none !important; }
      .show-mobile { display: block !important; }
    }
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
    { label: "Meet Mel", page: "about" },
    { label: "Listings", page: "properties" },
    { label: "Neighborhoods", page: "neighborhoods" },
    {
      label: "Tools", children: [
        { label: "Home Valuation", page: "valuation" },
        { label: "Mortgage Calculator", page: "mortgage" },
        { label: "Buyer's Guide", page: "buyers" },
        { label: "Seller's Guide", page: "sellers" },
        { label: "Relocation Guide", page: "relocation" },
      ]
    },
    {
      label: "More", children: [
        { label: "Real Talk with Mel", page: "blog" },
        { label: "Market Insights", page: "market" },
      ]
    },
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

    </>
  );
}

// ─────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────

function HomePage({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const scrollY = useScrollY();
  const [melVideoMuted, setMelVideoMuted] = useState(true);
  const melVideoRef = useRef<HTMLVideoElement>(null);
  
  // API calls with fallback data
  const { data: agent } = useApi(() => api.getAgent(), FALLBACK_AGENT);
  const { data: stats } = useApi(() => api.getStats(), { homesSold: 120, totalSalesVolume: 75000000, yearsExperience: 8, clientSatisfactionRate: 100 });
  const { data: propsResp } = useApi(() => api.getProperties({ featured: true, limit: 3 }), { properties: [] });
  const { data: testiResp } = useApi(() => api.getTestimonials(), { testimonials: FALLBACK_TESTIMONIALS });
  const { data: nResp } = useApi(() => api.getNeighborhoods(), { neighborhoods: FALLBACK_NEIGHBORHOODS });

  return (
    <div>
      {/* HERO */}
      <section style={{ position: "relative", width: "100%", height: "100vh", minHeight: 700, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Hero background — video only; solid dark fallback if video fails */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
          background: "#0D1A20",
          width: "100%",
        }}>
          <video
            autoPlay muted loop playsInline
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", minWidth: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
            onError={e => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
          >
            <source src="/images/hero-bg.mp4" type="video/mp4" />
            <source src="/images/hero-bg.webm" type="video/webm" />
          </video>
        </div>

        {/* Cinematic overlay — dark top + darker bottom for legible text */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.72) 100%)" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px", maxWidth: 860, marginTop: 40 }}>
          <div className="hero-text-anim hero-text-anim-d1" style={{
            display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
            padding: "7px 22px", backdropFilter: "blur(12px)",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: BRAND.gold }} />
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 500 }}>O'ahu REALTOR® · RS-84753</span>
          </div>
          <h1 className="font-display hero-text-anim hero-text-anim-d2" style={{ fontSize: "clamp(42px, 7vw, 86px)", lineHeight: 1.0, marginBottom: 24, color: "#ffffff", textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>
            Your Home in{" "}
            <em style={{ color: BRAND.gold }}>Hawai'i</em>
            <br />Starts Here
          </h1>
          <p className="hero-text-anim hero-text-anim-d3" style={{ color: "rgba(255,255,255,0.82)", fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 48px", fontWeight: 300, letterSpacing: "0.01em" }}>
            Mel Castanares — O'ahu born, family-focused, and relentlessly honest about every home she sells.
          </p>
          <div className="hero-text-anim hero-text-anim-d4" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => go("properties")} style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: BRAND.gold, color: "#fff",
              border: "none", padding: "15px 36px", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.3s, transform 0.2s",
            }} onMouseEnter={e => { e.currentTarget.style.background = BRAND.goldDark; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = BRAND.gold; e.currentTarget.style.transform = "translateY(0)"; }}>
              <Search size={13} /> Start Your Search
            </button>
            <button onClick={() => go("valuation")} style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#fff",
              border: "1px solid rgba(255,255,255,0.55)", padding: "15px 36px", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.3s",
            }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)"; }}>
              What's My Home Worth?
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          opacity: scrollY > 80 ? 0 : 1, transition: "opacity 0.5s",
        }}>
          <div style={{ width: 1, height: 44, background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)" }} className="float" />
          <span style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Scroll</span>
        </div>
      </section>

      {/* QUICK LINKS — floating action bar */}
      <section style={{ paddingTop: 0, paddingBottom: 0, position: "relative", zIndex: 10 }}>
        <div className="section-pad" style={{ paddingTop: 0, paddingBottom: 0, maxWidth: 1100, margin: "0 auto" }}>
          <div className="ql-bar" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              background: BRAND.bgCard,
              border: `1px solid ${BRAND.border}`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
              overflow: "hidden",
              marginTop: -56,
              position: "relative",
              zIndex: 10,
            }}>
              {[
                { icon: <Search size={20} />, title: "Home Search", desc: "Browse O'ahu listings", page: "properties" },
                { icon: <DollarSign size={20} />, title: "Home Valuation", desc: "What's your home worth?", page: "valuation" },
                { icon: <Calendar size={20} />, title: "Mortgage Calculator", desc: "Estimate payments instantly", page: "mortgage" },
              ].map((item, i) => (
                <button key={i} onClick={() => go(item.page)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "28px 32px",
                  borderRight: i < 2 ? `1px solid ${BRAND.border}` : "none",
                  display: "flex", alignItems: "center", gap: 16,
                  transition: "background 0.2s",
                  textAlign: "left",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = BRAND.bgElevated)}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: `${BRAND.teal}18`, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: BRAND.teal,
                  }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: BRAND.text, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: BRAND.teal, marginLeft: "auto", flexShrink: 0 }} />
                </button>
              ))}
            </div>
        </div>
      </section>

      {/* MEET MEL — cinematic split */}
      <section style={{ background: BRAND.bgLight, borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}`, paddingTop: 80, paddingBottom: 80 }}>
        <div className="section-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="mel-split" style={{ display: "grid", gridTemplateColumns: "clamp(280px,55%,640px) 1fr", gap: 72, alignItems: "center" }}>
            <Reveal direction="right">
              <div style={{
                position: "relative", borderRadius: 24, overflow: "hidden",
                boxShadow: `0 40px 100px rgba(0,0,0,0.22), 0 0 0 1px ${BRAND.gold}30`,
                aspectRatio: "9/16", maxHeight: 680,
              }}>
                <video
                  ref={melVideoRef}
                  src="/videos/mel-hero.mp4"
                  autoPlay
                  loop
                  muted={melVideoMuted}
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
                />
                {/* Mute / Unmute toggle */}
                <button
                  onClick={() => {
                    const newMuted = !melVideoMuted;
                    setMelVideoMuted(newMuted);
                    if (melVideoRef.current) melVideoRef.current.muted = newMuted;
                  }}
                  title={melVideoMuted ? "Turn on sound" : "Mute"}
                  style={{
                    position: "absolute", top: 16, right: 16,
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(10,10,10,0.65)", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.2s",
                    zIndex: 10,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(30,30,30,0.85)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(10,10,10,0.65)")}
                >
                  {melVideoMuted ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                  )}
                </button>
                {/* Name tag overlay */}
                <div style={{
                  position: "absolute", bottom: 24, left: 24, right: 24,
                  background: "rgba(10,10,10,0.72)", backdropFilter: "blur(16px)",
                  borderRadius: 12, padding: "14px 20px",
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 16, marginBottom: 2 }}>Mel Castanares</div>
                  <div style={{ color: BRAND.gold, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>REALTOR® · RS-84753 · Dream Home Realty Hawai'i</div>
                </div>
              </div>
            </Reveal>
            <Reveal direction="left" delay={0.2}>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 20, fontWeight: 600 }}>Meet Your Agent</div>
              <h2 className="font-display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", lineHeight: 1.1, marginBottom: 28 }}>
                <em style={{ color: BRAND.gold }}>O'ahu born.</em><br />Family first.<br />Relentlessly honest.
              </h2>
              <p style={{ color: BRAND.textMuted, fontSize: 16, lineHeight: 1.85, marginBottom: 32 }}>
                Mel is a <strong style={{ color: BRAND.text }}>mama REALTOR®</strong> who grew up in <strong style={{ color: BRAND.text }}>Central O'ahu</strong> and spent years managing properties before earning her license. She brings an <strong style={{ color: BRAND.text }}>investor's eye</strong> and a <strong style={{ color: BRAND.text }}>mother's instincts</strong> — helping families find not just a house, but the right <em>life</em> in Hawai'i.
              </p>
              {/* Credential tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
                {["Central & West O'ahu", "First-Time Buyers", "Property Management", "Relocation Expert"].map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "6px 14px", borderRadius: 20,
                    border: `1px solid ${BRAND.border}`, color: BRAND.textMuted,
                    background: BRAND.bgElevated, letterSpacing: "0.05em",
                  }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => go("about")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Full Story <ArrowRight size={14} />
                </button>
                <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer"
                  className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 11, padding: "14px 20px" }}>
                  <Instagram size={14} /> @__mellio
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>


      {/* FEATURED PROPERTIES / LISTING PORTALS */}
      <section className="section-pad">
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Live MLS + AppFolio</div>
              <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>Current Listings</h2>
            </div>
            <button className="btn-outline" onClick={() => go("properties")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Browse All <ArrowRight size={14} />
            </button>
          </div>
        </Reveal>

        {/* If API returns featured listings, show them; otherwise show portal cards */}
        {(propsResp?.properties || []).filter(p => p.featured && p.type !== "rental" && p.price >= 10000).length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
            {(propsResp?.properties || []).filter(p => p.featured && p.type !== "rental" && p.price >= 10000).map((p, i) => (
              <Reveal key={p.id} delay={i * 0.15} direction="up">
                <PropertyCard property={p} onClick={() => { setPage("property-detail"); window.__selectedProperty = p; window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { label: "Search All MLS Listings", sub: "Updated daily from O'ahu MLS", url: "https://www.dreamhomerealtyhawaii.com/property-search", img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80" },
              { label: "Available Rentals", sub: "Managed by Dream Home Realty", url: "https://dreamhomerlty.appfolio.com/listings/", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" },
              { label: "Open Houses", sub: "This week on O'ahu", url: "https://propertysearch.hicentral.com/HBR/OpenHouses/?/Results/HotSheet/d///", img: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.07} direction="up">
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", position: "relative", overflow: "hidden",
                  aspectRatio: "4/3", textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  transition: "transform 0.25s, box-shadow 0.25s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 16px 48px rgba(0,0,0,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"; }}>
                  {/* Background photo */}
                  <img src={item.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {/* Dark gradient */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.2) 60%, transparent 100%)" }} />
                  {/* Text */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 22px" }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'DM Serif Display', Georgia, serif", marginBottom: 4, lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>{item.sub}</div>
                    <div style={{ color: BRAND.gold, fontSize: 11, fontWeight: 600, marginTop: 8 }}>View ↗</div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* NEIGHBORHOODS — interactive showcase */}
      <NeighborhoodShowcase
        neighborhoods={nResp?.neighborhoods || FALLBACK_NEIGHBORHOODS}
        onNavigate={() => go("neighborhoods")}
        onNavigateDetail={(n) => { window.__selectedNeighborhood = n; go("neighborhood-detail"); }}
      />

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

      {/* CTA — photo background */}
      <section style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('/images/6704A771-F22B-4EB3-8CA3-061F928411C6.png')",
          backgroundSize: "cover", backgroundPosition: "center 30%",
          filter: "brightness(0.35)",
        }} />
        <div className="section-pad" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <h2 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.15, marginBottom: 20, color: "#fff" }}>
            Ready to Find Your<br /><em style={{ color: BRAND.gold }}>Dream Home?</em>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Whether buying, selling, or investing — Mel is ready to guide you every step of the way.
          </p>
          <button className="btn-primary" onClick={() => go("contact")} style={{ padding: "16px 40px" }}>Let's Connect</button>
        </Reveal>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// NEIGHBORHOOD SHOWCASE
// ─────────────────────────────────────────────

function NeighborhoodShowcase({ neighborhoods = [], onNavigate, onNavigateDetail }: { neighborhoods: any[]; onNavigate: () => void; onNavigateDetail: (n: any) => void }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const items = neighborhoods.slice(0, 8);

  const handleSelect = (i: number) => {
    if (i === active) {
      onNavigateDetail(items[i]);
      return;
    }
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 260);
  };

  const n = items[active] || {};
  const imgUrl = n.coverImage || n.images?.[0]?.url || n.img || "";
  const highlights: string[] = n.highlights || [];

  return (
    <section style={{ background: BRAND.bgLight, borderTop: `1px solid ${BRAND.border}` }}>
      {/* Section header */}
      <div className="section-pad" style={{ paddingBottom: 0, textAlign: "center" }}>
        <Reveal>
          <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Explore O'ahu</div>
          <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)", marginBottom: 48 }}>
            Find Your <em style={{ color: BRAND.gold }}>Neighborhood</em>
          </h2>
        </Reveal>
      </div>

      {/* Split layout */}
      <div className="nh-split" style={{ display: "flex", minHeight: 560, maxWidth: 1400, margin: "0 auto", overflow: "hidden" }}>
        {/* Left — neighborhood list */}
        <div className="nh-list" style={{
          width: "clamp(220px, 30%, 320px)", flexShrink: 0,
          background: BRAND.bg, borderRight: `1px solid ${BRAND.border}`,
          overflowY: "auto",
        }}>
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => handleSelect(i)}
              data-active={i === active ? "true" : "false"}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "20px 28px", border: "none",
                borderLeft: i === active ? `3px solid ${BRAND.gold}` : "3px solid transparent",
                cursor: "pointer", transition: "all 0.2s",
                borderBottom: `1px solid ${BRAND.border}`,
                background: i === active ? `${BRAND.gold}10` : "transparent",
              }}
              onMouseEnter={e => { if (i !== active) (e.currentTarget as HTMLButtonElement).style.background = BRAND.bgElevated; }}
              onMouseLeave={e => { if (i !== active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{
                fontWeight: i === active ? 700 : 500, fontSize: 15,
                color: i === active ? BRAND.gold : BRAND.text,
                marginBottom: 3, transition: "color 0.2s",
              }}>{item.name}</div>
              <div className="nh-tagline" style={{ fontSize: 11, color: BRAND.textMuted, lineHeight: 1.4 }}>{item.tagline}</div>
            </button>
          ))}
        </div>

        {/* Right — image + info overlay */}
        <div className="nh-img" style={{ flex: 1, position: "relative", minHeight: 520, overflow: "hidden" }}>
          {/* Crossfading image */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: imgUrl ? `url('${imgUrl}')` : "none",
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: fading ? 0 : 1,
            transition: "opacity 0.28s ease",
          }} />
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.3) 55%, transparent 100%)" }} />

          {/* Info overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 48px",
            opacity: fading ? 0 : 1, transition: "opacity 0.28s ease",
          }}>
            <div style={{ color: BRAND.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
              {n.medianHomePrice && `Median ${n.medianHomePrice}`}{n.growth && ` · ${n.growth} YoY`}
            </div>
            <h3 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: "#fff", marginBottom: 10, lineHeight: 1.1 }}>{n.name}</h3>
            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 20, maxWidth: 480, lineHeight: 1.65 }}>{n.tagline}</p>
            {highlights.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {highlights.map(h => (
                  <span key={h} style={{
                    fontSize: 10, padding: "5px 12px",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em",
                    background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
                  }}>{h}</span>
                ))}
              </div>
            )}
            <button onClick={() => onNavigateDetail(n)} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: BRAND.gold, color: "#fff", border: "none",
              padding: "12px 28px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = BRAND.goldDark)}
              onMouseLeave={e => (e.currentTarget.style.background = BRAND.gold)}
            >
              Explore {n.name} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </section>
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
  const [tab, setTab] = useState<"sale" | "rental">("sale");
  const [filter, setFilter] = useState<{ status: string; type: string }>({ status: "", type: "" });
  const [rentals, setRentals] = useState<any[]>([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [rentalsError, setRentalsError] = useState<string | null>(null);

  // Sale properties are browsed via MLS portals — not stored here
  const filtered = useMemo<any[]>(() => [], []);

  useEffect(() => {
    // Fetch live rentals from Express /api/rentals → AppFolio scrape (5-hour cache)
    api.getRentals()
      .then((data: any) => {
        if (!data) throw new Error("No response");
        if (data.error && !data.properties?.length) {
          setRentalsError(data.error);
        } else {
          setRentals(data.properties || []);
        }
      })
      .catch((e: any) => setRentalsError(e?.message || "Failed to load listings"))
      .finally(() => setRentalsLoading(false));
  }, []);

  const SALE_PORTALS = [
    { label: "Search All MLS Listings", url: "https://www.dreamhomerealtyhawaii.com/property-search", primary: true, icon: <Search size={14} /> },
    { label: "Open Houses This Week", url: "https://propertysearch.hicentral.com/HBR/OpenHouses/?/Results/HotSheet/d///", icon: <Calendar size={14} /> },
  ];

  return (
    <div style={{ paddingTop: 120 }}>
      {/* Hero */}
      <section style={{ position: "relative", padding: "80px 24px 100px", overflow: "hidden", textAlign: "center" }}>
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(27,42,51,0.85) 0%, rgba(26,138,125,0.5) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <div style={{ color: "#fff", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 16, opacity: 0.8 }}>Dream Home Realty</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 7vw, 68px)", color: "#fff", marginBottom: 16, lineHeight: 1.05 }}>
              Current <span style={{ fontStyle: "italic", color: BRAND.goldLight }}>Listings</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
              Browse Mel's active rentals, homes for sale, and land opportunities across O'ahu.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="section-pad" style={{ paddingTop: 40 }}>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: 16, marginBottom: 48, flexWrap: "wrap", padding: 24, background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 12, alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Status</label>
              <select className="input-custom" style={{ maxWidth: 180 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Type</label>
              <select className="input-custom" style={{ maxWidth: 180 }} value={filter.type} onChange={e => {
                const type = e.target.value;
                setFilter(f => ({ ...f, type }));
                setTab(type === "rental" ? "rental" : "sale");
              }}>
                <option value="">All Types</option>
                <option value="rental">Rentals</option>
                <option value="single_family">Single Family</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginLeft: "auto" }}>
              <a href="https://propertysearch.hicentral.com/HBR/OpenHouses/?/Results/HotSheet/d///" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "10px 16px", textDecoration: "none", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8 }}>
                <Calendar size={13} /> Open Houses
              </a>
              <a href="https://www.dreamhomerealtyhawaii.com/property-search" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "10px 16px", textDecoration: "none", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8 }}>
                <Search size={13} /> Full MLS Search
              </a>
            </div>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08} direction="up">
              <PropertyCard property={p} onClick={() => { setPage("property-detail"); window.__selectedProperty = p; window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </Reveal>
          ))}
        </div>

        {/* FOR SALE — MLS portals */}
        {tab === "sale" && (
          <div>
            <Reveal>
              <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "48px 40px", textAlign: "center", marginBottom: 40, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})` }} />
                <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Live MLS Data</div>
                <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 14 }}>Browse O'ahu Listings in Real Time</h2>
                <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.7, marginBottom: 28, maxWidth: 520, margin: "0 auto 28px" }}>
                  Mel's curated listings pull directly from the O'ahu MLS — updated the moment a property changes status. Search by neighborhood, price, and type.
                </p>
                <a href="https://www.dreamhomerealtyhawaii.com/property-search" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: "none", fontSize: 13, padding: "14px 36px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Search size={15} /> Search All Listings ↗
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Quick Access</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
                {SALE_PORTALS.slice(1).map(p => (
                  <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
                    background: BRAND.bgCard, border: `1px solid ${BRAND.border}`,
                    textDecoration: "none", color: BRAND.text, fontSize: 13, fontWeight: 500,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BRAND.gold; (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 16px rgba(0,0,0,0.08)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BRAND.border; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}>
                    <span style={{ color: BRAND.teal }}>{p.icon}</span>
                    <span style={{ flex: 1 }}>{p.label}</span>
                    <ArrowRight size={12} color={BRAND.textDim} />
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* RENTALS — live from AppFolio */}
        {tab === "rental" && (
          <div>
            {/* Loading */}
            {rentalsLoading && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ maxWidth: 360, margin: "0 auto 20px", background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div className="ai-loading-bar" style={{ height: "100%", background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})`, borderRadius: 4 }} />
                </div>
                <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Loading live rentals from AppFolio...</p>
              </div>
            )}

            {/* Error */}
            {!rentalsLoading && rentalsError && (
              <Reveal>
                <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "52px 40px", textAlign: "center" }}>
                  <div style={{ color: BRAND.textDim, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Live Feed Unavailable</div>
                  <h3 className="font-display" style={{ fontSize: 26, marginBottom: 12 }}>Rental Listings</h3>
                  <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
                    Our live rental feed is temporarily unavailable. Browse all current rentals directly on AppFolio — managed by Dream Home Realty Hawaii.
                  </p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <a href="https://dreamhomerlty.appfolio.com/listings/" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <HomeIcon size={14} /> View Rentals on AppFolio ↗
                    </a>
                    <a href="tel:+18082858774" className="btn-outline" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, padding: "12px 24px" }}>
                      <Phone size={14} /> Call Mel · (808) 285-8774
                    </a>
                  </div>
                </div>
              </Reveal>
            )}

            {/* Empty */}
            {!rentalsLoading && !rentalsError && rentals.length === 0 && (
              <Reveal>
                <div style={{ background: BRAND.bgCard, border: `1px dashed ${BRAND.border}`, padding: "60px 40px", textAlign: "center" }}>
                  <h3 className="font-display" style={{ fontSize: 26, marginBottom: 10 }}>No Rentals Available Right Now</h3>
                  <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 24 }}>
                    New properties are added regularly. Check AppFolio for the latest or reach out to Mel.
                  </p>
                  <a href="https://dreamhomerlty.appfolio.com/listings/" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: "none", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px" }}>
                    Check AppFolio ↗
                  </a>
                </div>
              </Reveal>
            )}

            {/* Live listings */}
            {!rentalsLoading && !rentalsError && rentals.length > 0 && (
              <>
                <div style={{ background: `${BRAND.teal}0F`, border: `1px solid ${BRAND.teal}30`, padding: "12px 18px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.teal }} />
                    <span style={{ fontSize: 13, color: BRAND.teal, fontWeight: 600 }}>Live from AppFolio · {rentals.length} propert{rentals.length === 1 ? "y" : "ies"} available</span>
                  </div>
                  <a href="https://dreamhomerlty.appfolio.com/listings/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.teal, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    Apply on AppFolio <ArrowRight size={11} />
                  </a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
                  {rentals.map((p, i) => (
                    <Reveal key={p.id} delay={i * 0.08} direction="up">
                      <PropertyCard
                        property={p}
                        onClick={() => { window.open(p.listingUrl || "https://dreamhomerlty.appfolio.com/listings/", "_blank"); }}
                      />
                    </Reveal>
                  ))}
                </div>
              </>
            )}
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
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: `0 32px 80px rgba(0,0,0,0.16), 0 0 0 1px ${BRAND.gold}22` }}>
              <img
                src="/images/mel-headshot.jpg"
                alt="Mel Castanares"
                style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", objectPosition: "center top", display: "block" }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, transparent, rgba(27,42,51,0.6))", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 20, left: 20, color: "#fff" }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.9 }}>Mel Castanares</div>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.1em" }}>REALTOR® · RS-84753</div>
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

            {/* Credential bar */}
            <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 32, borderTop: `1px solid ${BRAND.border}`, flexWrap: "wrap" }}>
              {["RS-84753 Licensed", "Dream Home Realty Hawaii", "Central & West O'ahu Specialist", "Property Management Expert"].map((tag, i) => (
                <span key={i} style={{ fontSize: 11, padding: "6px 14px", background: BRAND.bgElevated, border: `1px solid ${BRAND.border}`, color: BRAND.textMuted, letterSpacing: "0.08em" }}>{tag}</span>
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
              <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 11, padding: "14px 24px" }}>
                <Instagram size={14} /> @__mellio
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      {/* THE FIRM */}
      <div style={{ background: BRAND.bgCard, borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}` }}>
        <div className="section-pad" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 64, alignItems: "center" }}>
              {/* Firm identity */}
              <div>
                <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>The Brokerage</div>
                <h2 className="font-display" style={{ fontSize: "clamp(28px, 3.5vw, 42px)", marginBottom: 16, lineHeight: 1.15 }}>
                  Dream Home Realty <em style={{ color: BRAND.gold }}>Hawai'i</em>
                </h2>
                <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
                  Dream Home Realty Hawaii LLC is a boutique, locally-owned real estate firm headquartered in Mililani — built on the belief that every client deserves expert guidance without the corporate runaround. We specialize in residential sales, rentals, and property management across O'ahu.
                </p>
                <p style={{ color: BRAND.textMuted, fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                  As a smaller firm, we are intentionally selective about the clients we work with — so every buyer and seller gets <strong style={{ color: BRAND.text }}>Mel's direct attention</strong>, not a junior agent. No hand-offs, no surprises.
                </p>
                <a href="http://www.dreamhomerealtyhawaii.com" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, padding: "12px 24px" }}>
                  Visit the Firm ↗
                </a>
              </div>
              {/* Firm stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { icon: "🏡", val: "Boutique", label: "Locally Owned & Operated" },
                  { icon: "📍", val: "Mililani", label: "Headquartered on O'ahu" },
                  { icon: "🤝", val: "Full-Service", label: "Sales · Rentals · Mgmt" },
                  { icon: "⭐", val: "5-Star", label: "Client Satisfaction Rating" },
                ].map((s, i) => (
                  <div key={i} style={{ background: BRAND.bgElevated, border: `1px solid ${BRAND.border}`, padding: "24px 20px" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: BRAND.text, marginBottom: 4 }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: BRAND.textDim, lineHeight: 1.4 }}>{s.label}</div>
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1", background: BRAND.bgElevated, border: `1px solid ${BRAND.border}`, padding: "20px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <MapPin size={18} color={BRAND.teal} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>95-1249 Meheula Parkway, #B-15B</div>
                    <div style={{ fontSize: 12, color: BRAND.textDim }}>Mililani, HI 96789 · (808) 285-8774</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="section-pad">
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Client Stories</div>
            <h2 className="font-display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>What Clients Are <em style={{ color: BRAND.gold }}>Saying</em></h2>
          </div>
        </Reveal>
        {/* Featured first-person quote */}
        <Reveal delay={0.1}>
          <div style={{ background: BRAND.bgCard, border: `2px solid ${BRAND.gold}33`, padding: "40px 48px", marginBottom: 32, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BRAND.gold}, ${BRAND.teal})` }} />
            <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${BRAND.gold}22`, border: `3px solid ${BRAND.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Star size={28} color={BRAND.gold} fill={BRAND.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={BRAND.gold} color={BRAND.gold} />)}
                </div>
                <p className="font-display" style={{ fontSize: "clamp(16px, 2vw, 20px)", fontStyle: "italic", lineHeight: 1.65, marginBottom: 16, color: BRAND.text }}>
                  "This was the first time renting a house on my own so I was really skeptical on which company to go with. I put my trust in Mel and they made the entire process smooth and easy. Anytime I've had a problem or concern they were able to get back to me right away!"
                </p>
                <div style={{ color: BRAND.teal, fontWeight: 600, fontSize: 13 }}>First-Time Renter · Kāne'ohe</div>
              </div>
            </div>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {FALLBACK_TESTIMONIALS.slice(1).map((t, i) => (
            <Reveal key={i} delay={i * 0.08} direction="up">
              <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "28px 28px", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={13} fill={BRAND.teal} color={BRAND.teal} />)}
                </div>
                <p style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.7, color: BRAND.textMuted, flex: 1, marginBottom: 16 }}>"{t.quote || t.text}"</p>
                <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: BRAND.text }}>{t.clientName || t.name}</div>
                  <div style={{ fontSize: 11, color: BRAND.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{t.transactionType}</div>
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
// NEIGHBORHOODS PAGE
// ─────────────────────────────────────────────

function NeighborhoodsPage({ setPage }) {
  const { data: nResp } = useApi(() => api.getNeighborhoods(), { neighborhoods: FALLBACK_NEIGHBORHOODS });
  const neighborhoods = nResp?.neighborhoods || FALLBACK_NEIGHBORHOODS;
  const goDetail = (n) => { window.__selectedNeighborhood = n; setPage("neighborhood-detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ paddingTop: 120 }}>
      {/* Hero */}
      <section style={{ position: "relative", padding: "80px 24px 100px", overflow: "hidden", textAlign: "center" }}>
        <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(27,42,51,0.85) 0%, rgba(26,138,125,0.5) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <div style={{ color: "#fff", fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 16, opacity: 0.8 }}>Explore O'ahu</div>
            <h1 className="font-display" style={{ fontSize: "clamp(40px, 7vw, 68px)", color: "#fff", marginBottom: 16, lineHeight: 1.05 }}>
              Find Your <span style={{ fontStyle: "italic", color: BRAND.goldLight }}>Neighborhood</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              Every neighborhood on O'ahu has its own personality. Tap any to explore schools, dining, lifestyle, and what it's really like to live there.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="section-pad">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 28 }}>
          {neighborhoods.map((n, i) => (
            <Reveal key={n.id} delay={i * 0.08} direction="up">
              <div className="card-hover" onClick={() => goDetail(n)} style={{ cursor: "pointer", background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, overflow: "hidden", borderRadius: 12, height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="img-zoom" style={{ aspectRatio: "16/9", position: "relative" }}>
                  <img src={n.coverImage || n.images?.[0]?.url || n.img} alt={n.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
                  <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                    <h3 className="font-display" style={{ fontSize: 28, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{n.name}</h3>
                    <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{n.tagline}</p>
                  </div>
                  {n.growth && <div style={{ position: "absolute", top: 12, right: 12, background: `${BRAND.teal}DD`, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, letterSpacing: "0.05em" }}>{n.growth} YoY</div>}
                </div>
                <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
                  <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7, flex: 1, marginBottom: 16 }}>{n.description}</p>
                  {n.vibe && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>{n.vibe.split(" · ").map((v, j) => <span key={j} style={{ padding: "4px 10px", background: `${BRAND.teal}0A`, border: `1px solid ${BRAND.teal}22`, borderRadius: 20, fontSize: 11, color: BRAND.teal, fontWeight: 500 }}>{v}</span>)}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${BRAND.border}` }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textDim }}>Median</div>
                      <div className="font-display" style={{ fontSize: 22, color: BRAND.teal }}>{n.medianHomePrice}</div>
                    </div>
                    <span style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>Explore <ArrowRight size={14} /></span>
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
// NEIGHBORHOOD DETAIL PAGE
// ─────────────────────────────────────────────

function NeighborhoodDetailPage({ setPage }) {
  const n = window.__selectedNeighborhood || FALLBACK_NEIGHBORHOODS[0];
  const go = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ paddingTop: 120 }}>
      {/* Hero */}
      <section style={{ position: "relative", height: "50vh", minHeight: 350, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src={n.coverImage || n.images?.[0]?.url} alt={n.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(27,42,51,0.9) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 24px 48px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <button onClick={() => go("neighborhoods")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: "'DM Sans'" }}><ArrowLeft size={14} /> All Neighborhoods</button>
          <h1 className="font-display" style={{ fontSize: "clamp(40px, 7vw, 64px)", color: "#fff", marginBottom: 8 }}>{n.name}</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }}>{n.tagline}</p>
        </div>
      </section>

      <div className="section-pad" style={{ paddingTop: 48 }}>
        {/* Stats bar */}
        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 20, marginBottom: 48 }}>
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: 28, color: BRAND.teal }}>{n.medianHomePrice}</div>
              <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Median Price</div>
            </div>
            {n.growth && <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: 28, color: "#4CAF50" }}>{n.growth}</div>
              <div style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Annual Growth</div>
            </div>}
          </div>
        </Reveal>

        {/* About */}
        <Reveal delay={0.1}>
          <h2 className="font-display" style={{ fontSize: 32, marginBottom: 16 }}>Living in {n.name}</h2>
          <div style={{ color: BRAND.textMuted, fontSize: 16, lineHeight: 1.9, marginBottom: 48, maxWidth: 800 }}>
            {(n.longDesc || n.description).split("\n\n").map((para: string, i: number) => (
              <p key={i} style={{ marginBottom: 20 }}>
                {para.includes(":") && !para.startsWith("Mel") ? (
                  <>
                    <strong style={{ color: BRAND.text }}>{para.split(":")[0]}:</strong>
                    {para.slice(para.indexOf(":") + 1)}
                  </>
                ) : para}
              </p>
            ))}
          </div>
        </Reveal>

        {/* Photo gallery */}
        {n.images && n.images.length > 1 && (
          <Reveal delay={0.15}>
            <h2 className="font-display" style={{ fontSize: 28, marginBottom: 20 }}>Photo Gallery</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 56 }}>
              {n.images.map((img: any, i: number) => (
                <div key={i} style={{ aspectRatio: "4/3", overflow: "hidden", borderRadius: 10, background: BRAND.bgElevated }}>
                  <img
                    src={img.url}
                    alt={`${n.name} ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 48 }}>
          {[
            { icon: <BookOpen size={20} color={BRAND.teal} />, title: "Schools", content: n.schools },
            { icon: <MapPin size={20} color={BRAND.teal} />, title: "Dining & Shopping", content: n.dining },
            { icon: <Star size={20} color={BRAND.teal} />, title: "Things to Do", content: n.thingsToDo },
          ].filter(s => s.content).map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>{s.icon}<h3 style={{ fontSize: 16, fontWeight: 600 }}>{s.title}</h3></div>
                <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7 }}>{s.content}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal>
          <div style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})`, borderRadius: 16, padding: "40px 32px", textAlign: "center", color: "#fff" }}>
            <h3 className="font-display" style={{ fontSize: 28, marginBottom: 12 }}>Interested in {n.name}?</h3>
            <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 24 }}>Mel knows this neighborhood inside and out. Let's find your perfect home here.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => go("contact")} style={{ background: "#fff", color: BRAND.teal }}>Talk to Mel</button>
              <button className="btn-outline" onClick={() => go("properties")} style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>View Listings</button>
            </div>
          </div>
        </Reveal>
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
      {/* Hero */}
      <section style={{ position: "relative", padding: "80px 24px 100px", overflow: "hidden" }}>
        <img src="/images/mel-headshot.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", filter: "blur(30px) brightness(0.4)", transform: "scale(1.2)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(27,42,51,0.92) 0%, rgba(26,138,125,0.6) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          <Reveal direction="right">
            <img src="/images/mel-headshot.jpg" alt="Mel" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }} />
          </Reveal>
          <Reveal>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: BRAND.goldLight, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>Real Talk with Mel</div>
              <h1 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 52px)", color: "#fff", lineHeight: 1.1, marginBottom: 12 }}>
                The Stuff Your<br/>Agent <span style={{ fontStyle: "italic", color: BRAND.goldLight }}>Won't</span> Tell You
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, maxWidth: 440, lineHeight: 1.6 }}>
                Market secrets, uncomfortable truths, and the insider knowledge that actually moves the needle when you're buying or selling on O'ahu.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="section-pad" style={{ paddingTop: 48 }}>

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

        {/* Instagram CTA Section */}
        <Reveal delay={0.2}>
          <div style={{ marginTop: 80, paddingTop: 56, borderTop: `1px solid ${BRAND.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <Instagram size={14} /> On Instagram
                </div>
                <h3 className="font-display" style={{ fontSize: 28 }}>Follow Along</h3>
              </div>
              <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 11, textDecoration: "none" }}>
                <Instagram size={14} /> @__mellio
              </a>
            </div>
            {/* Instagram — split: embedded reel on left, profile card on right */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
              {/* Embedded reel iframe */}
              <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "#000", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Instagram size={14} color="#fff" />
                  </div>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>@__mellio</span>
                </div>
                <div style={{ position: "relative", paddingBottom: "177%", height: 0, overflow: "hidden" }}>
                  <iframe
                    src="https://www.instagram.com/reel/DWQWkHZgg2j/embed"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                    loading="lazy"
                    title="Mel Castanares Instagram Reel"
                  />
                </div>
              </div>

              {/* Profile card */}
              <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
                <div style={{
                  background: BRAND.bgCard, border: `1px solid ${BRAND.border}`,
                  borderRadius: 16, overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
                  transition: "box-shadow 0.25s, transform 0.25s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 56px rgba(0,0,0,0.13)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {/* Header gradient */}
                  <div style={{ height: 80, background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: -32, left: 24, width: 64, height: 64, borderRadius: "50%", border: "3px solid #fff", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      <img src="/images/mel-headshot.jpg" alt="Mel" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                    </div>
                  </div>
                  <div style={{ padding: "44px 24px 28px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: BRAND.text, marginBottom: 2 }}>__mellio</div>
                    <div style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 14 }}>Mel Castanares · REALTOR® · Dream Home Realty Hawai'i</div>
                    <p style={{ color: BRAND.textMuted, fontSize: 13, lineHeight: 1.65, marginBottom: 20 }}>
                      Real estate tips, market updates, and life in Hawai'i 🌺 O'ahu REALTOR® helping families find their place in paradise.
                    </p>
                    {/* Photo grid preview */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, marginBottom: 20, borderRadius: 8, overflow: "hidden" }}>
                      {["/images/mel-headshot.jpg", "/images/hero-diamondhead.jpg", "/images/mel-showing.jpg",
                        "/images/testimonial-sold.jpg", "/images/mel-headshot.jpg", "/images/hero-diamondhead.jpg"].map((src, i) => (
                        <div key={i} style={{ aspectRatio: "1", overflow: "hidden", background: BRAND.bgElevated }}>
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", color: "#fff", padding: "11px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      <Instagram size={14} /> Follow @__mellio
                    </div>
                  </div>
                </div>
              </a>
            </div>
            <p style={{ color: BRAND.textDim, fontSize: 13, marginTop: 20, textAlign: "center" }}>
              Market updates, listings, and O'ahu life — follow <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer" style={{ color: BRAND.teal, textDecoration: "none", fontWeight: 600 }}>@__mellio</a> on Instagram.
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
  "https://www.instagram.com/__mellio/embed",
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
  "why-oahu-buyers-are-winning-right-now": `Let me tell you something most agents won't say out loud: sellers are scared right now. Not panicking — but nervous in a way they haven't been since 2019. And that nervousness? It's your leverage.\n\nHere's the number that changed everything: 22%. That's how much inventory rose on O'ahu year-over-year. For context, that's the biggest jump in seven years. More homes available means more choices for you, less competition, and — this is the part that matters — room to negotiate in ways that would've gotten you laughed out of the room 12 months ago.\n\nI had a buyer close on a Kailua property last month. She assumed the seller's VA loan at 3.2%. Read that again. While everyone else is complaining about 7% rates, she's paying 3.2% because she knew to ask. Most agents don't even know this is possible.\n\nHere's what I'm seeing on the ground that the data doesn't capture: sellers who listed in late 2025 expecting multiple offers are sitting at 60+ days. Price reductions are up 34%. And the psychology is real — every "PRICE REDUCED" badge trains the next buyer to expect a deal.\n\nBut here's what separates smart buyers from everyone else right now: mortgage creativity. We're doing 2-1 buydowns (your rate drops 2% in year one, 1% in year two), seller-paid rate locks, and assumable mortgage transfers. These aren't exotic instruments — they're tools most agents are too lazy to learn.\n\nIf you're a seller reading this, here's your wake-up call: "list it and they will come" is over. You need professional photography, strategic day-one pricing, and an agent who markets your home like a product launch — not one who sticks it on the MLS and hopes for the best.\n\nO'ahu is still fundamentally one of the strongest real estate markets in America. Limited land. Growing demand. Unbeatable quality of life. But the tactics that work right now are completely different from six months ago.\n\nThe question isn't whether the market favors you. It does. The question is: are you positioned to take advantage of it before it shifts again?`,

  "i-toured-50-open-houses-so-you-dont-have-to": `I did something a little obsessive last month. For 30 straight days, I walked through every open house I could find on O'ahu. Fifty properties. Twenty-two neighborhoods. A $450K Makiki studio. A $12M Portlock estate. And a lot of shoes removed at a lot of front doors.\n\nHere's why: I wanted to find the pattern. What makes a home sell in two weeks versus sit for 90 days? And what I discovered surprised even me — because it had almost nothing to do with what most sellers spend their money on.\n\nReady? Here are the 5 things every fast-selling home had in common:\n\n1. THEY SMELLED LIKE NOTHING.\n\nNot Febreze. Not candles. Nothing. The fastest-selling homes had zero detectable scent. The slow sellers? Pet odor baked into carpet. Cooking smells trapped in curtains. That musty "nobody's opened the windows in months" ghost. This is the #1 silent deal-killer in real estate, and almost nobody addresses it properly.\n\n2. THE FIRST 8 SECONDS WERE CHOREOGRAPHED.\n\nNeuroscience shows buyers form their emotional opinion of a home within 8 seconds of walking through the door. The fast sellers all had a deliberate "moment" right at the entrance — an ocean view framed by a hallway, a kitchen island that pulled you forward, a staircase that made you look up. The slow sellers? A wall. A cramped entryway. Shoes piled by the door. You never get those 8 seconds back.\n\n3. NATURAL LIGHT WAS TREATED LIKE THE PRODUCT IT IS.\n\nEvery fast seller: sheer curtains or bare windows. Every slow seller: heavy drapes and dated blinds. In Hawai'i, light doesn't just illuminate your home — it IS the luxury. The moment you block it, you're hiding the thing people are paying for.\n\n4. THE OUTDOOR SPACE TOLD A STORY.\n\nA tiny lanai with two chairs, one plant, and string lights outsold a 500-square-foot bare concrete patio every single time. Why? Because buyers aren't evaluating square footage. They're imagining their morning coffee. They're projecting their life into your space. Give them something to project into.\n\n5. THE PRICE WAS A WEAPON, NOT A WISH.\n\nHomes priced 2-3% below comparable sales generated multiple offers and sold above ask. Homes priced "to leave room for negotiation" sat and eventually sold below what the strategic price would have gotten them. Your first two weeks on market determine everything. Miss that window, and you're chasing.\n\nWhat DIDN'T matter? Granite vs. quartz (nobody cared). Smart home features (cool, not a dealmaker). Paint color (as long as it was neutral). Crown molding (I know. I'm sorry).\n\nThe takeaway: selling a home in 2026 is a sensory experience. Square footage gets them in the door. How the home makes them feel in the first 8 seconds determines whether they write an offer.`,

  "default": `There's something most people don't realize about the O'ahu real estate market, and it's not what you'd expect.\n\nAfter 8 years of working this market — not from behind a desk, but in the neighborhoods, at the kitchen tables, through the inspections and the 2 AM anxiety texts — I've learned that the difference between a good outcome and a great one almost never comes down to the house itself.\n\nIt comes down to timing, strategy, and having someone in your corner who reads the market the way a surfer reads the ocean. Not from data alone, but from feel.\n\nThat's what I bring to every client. Whether you're buying your first home, selling a place full of memories, or investing in your family's future — I treat every transaction like it's my own money on the line. Because the way I see it, if you trust me with something this important, I owe you nothing less.\n\nIf any of this resonates, let's talk. Not a sales pitch. Just a real conversation about where you are, where you want to be, and how to get there smartly.\n\nCall me at (808) 285-8774 or shoot me a text. I answer.`
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
              { icon: <Instagram size={20} color={BRAND.teal} />, label: "Instagram", value: "@__mellio", href: "https://www.instagram.com/__mellio" },
              { icon: <User size={20} color={BRAND.teal} />, label: "Digital Business Card", value: "dot.cards/melcastanares", href: "https://dot.cards/melcastanares" },
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    address: "", neighborhood: "", propType: "",
    beds: 0, baths: 0, sqft: "", yearBuilt: "", condition: "",
    features: [] as string[],
    name: "", email: "", phone: "", timeline: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleFeature = (id: string) => setForm(prev => ({
    ...prev,
    features: prev.features.includes(id) ? prev.features.filter(x => x !== id) : [...prev.features, id],
  }));

  const NEIGHBORHOODS = ["Mililani", "Ewa Beach / Kapolei", "Pearl City / Aiea", "Kāne'ohe", "Kailua", "Kaimuki", "Hawai'i Kai", "North Shore", "Honolulu / Metro", "Waikiki", "Other"];
  const PROP_TYPES = ["Single Family", "Condo", "Townhouse", "Land"];
  const CONDITIONS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
  const FEATURES = [
    { id: "view", label: "Ocean / Mountain View", impact: "+8%" },
    { id: "pool", label: "Pool", impact: "+5%" },
    { id: "garage", label: "2-Car Garage", impact: "+3%" },
    { id: "renovated", label: "Recently Renovated", impact: "+7%" },
    { id: "solar", label: "Solar Panels", impact: "+4%" },
    { id: "adu", label: "ADU / Ohana Unit", impact: "+10%" },
  ];
  const STEPS = ["Property Info", "Home Details", "Features & You", "Your Estimate"];

  const computeEstimate = () => {
    const BASE: Record<string, number> = {
      "Mililani": 820000, "Ewa Beach / Kapolei": 780000, "Pearl City / Aiea": 620000,
      "Kāne'ohe": 890000, "Kailua": 1400000, "Kaimuki": 985000,
      "Hawai'i Kai": 1300000, "North Shore": 1100000, "Honolulu / Metro": 950000,
      "Waikiki": 750000, "Other": 850000,
    };
    let base = BASE[form.neighborhood] || 850000;
    const sqft = parseInt(form.sqft) || 1200;
    base = base * (sqft / 1200) * 0.6 + base * 0.4;
    base += ((form.beds || 3) - 3) * 25000;
    const condMult: Record<string, number> = { "Poor": 0.84, "Fair": 0.91, "Good": 1.0, "Very Good": 1.06, "Excellent": 1.13 };
    base *= condMult[form.condition] || 1.0;
    if (form.features.includes("view")) base *= 1.08;
    if (form.features.includes("pool")) base *= 1.05;
    if (form.features.includes("garage")) base *= 1.03;
    if (form.features.includes("renovated")) base *= 1.07;
    if (form.features.includes("solar")) base *= 1.04;
    if (form.features.includes("adu")) base *= 1.10;
    if (form.propType === "Condo") base *= 0.72;
    if (form.propType === "Townhouse") base *= 0.82;
    const low = Math.round(base * 0.94 / 5000) * 5000;
    const high = Math.round(base * 1.06 / 5000) * 5000;
    const median = Math.round(base / 5000) * 5000;
    const confidence = Math.min(78 + form.features.length * 3 + (form.condition ? 4 : 0), 94);
    const drivers: { label: string; impact: string; positive: boolean }[] = [];
    if (form.features.includes("adu")) drivers.push({ label: "ADU / Ohana Unit", impact: "+$85–140K", positive: true });
    if (form.features.includes("view")) drivers.push({ label: "Ocean / Mountain View", impact: "+$60–95K", positive: true });
    if (form.features.includes("renovated")) drivers.push({ label: "Recent Renovation", impact: "+$45–75K", positive: true });
    if (form.features.includes("pool")) drivers.push({ label: "Pool", impact: "+$25–45K", positive: true });
    if (form.features.includes("solar")) drivers.push({ label: "Solar Panels", impact: "+$20–35K", positive: true });
    if (form.features.includes("garage")) drivers.push({ label: "2-Car Garage", impact: "+$15–28K", positive: true });
    if (form.condition === "Excellent") drivers.push({ label: "Excellent Condition Premium", impact: "+$55–80K", positive: true });
    if (form.condition === "Fair") drivers.push({ label: "Condition Adjustment (Fair)", impact: "–$60–90K", positive: false });
    if (form.condition === "Poor") drivers.push({ label: "Condition Adjustment (Poor)", impact: "–$100–150K", positive: false });
    if (!drivers.length) drivers.push({ label: "Market Rate — " + (form.neighborhood || "O'ahu"), impact: "Baseline", positive: true });
    return { low, median, high, confidence, drivers };
  };

  const fmtPrice = (n: number) => "$" + n.toLocaleString();

  const goNext = () => {
    if (step < 3) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else {
      setLoading(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => { setResult(computeEstimate()); setLoading(false); setStep(4); }, 2800);
    }
  };
  const goBack = () => { setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const btnStyle = (active: boolean, color: string) => ({
    background: active ? color : BRAND.bgCard,
    color: active ? "#fff" : BRAND.textMuted,
    border: `1px solid ${active ? color : BRAND.border}`,
    cursor: "pointer", transition: "all 0.18s",
    fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{ paddingTop: 120, minHeight: "100vh" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", padding: "40px 24px 0" }}>
        <Reveal>
          <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>AI-Powered · Free</div>
          <h1 className="font-display" style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 12 }}>What's Your Home Worth?</h1>
          <p style={{ color: BRAND.textMuted, fontSize: 15, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Answer a few questions and get an instant AI estimate based on real O'ahu market data — then Mel will follow up with a full CMA at no charge.
          </p>
        </Reveal>
      </section>

      <div className="section-pad" style={{ paddingTop: 0, maxWidth: 760, margin: "0 auto" }}>
        {/* Progress steps */}
        {step < 4 && !loading && (
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 8 }}>
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: i < step - 1 ? BRAND.teal : (i === step - 1 ? BRAND.gold : BRAND.bgCard),
                      border: `2px solid ${i < step - 1 ? BRAND.teal : (i === step - 1 ? BRAND.gold : BRAND.border)}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: i <= step - 1 ? "#fff" : BRAND.textDim, fontSize: 13, fontWeight: 700,
                      transition: "all 0.3s",
                    }}>
                      {i < step - 1 ? <CheckCircle size={15} /> : i + 1}
                    </div>
                    <div style={{ fontSize: 10, color: i === step - 1 ? BRAND.gold : BRAND.textDim, marginTop: 6, letterSpacing: "0.05em", textAlign: "center", maxWidth: 72 }}>{s}</div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < step - 1 ? BRAND.teal : BRAND.border, marginTop: 16, transition: "background 0.3s" }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 className="font-display" style={{ fontSize: 30, marginBottom: 6 }}>Let's start with the basics</h2>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 36 }}>Tell us about your property's location and type.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 8, fontWeight: 600 }}>Street Address</label>
                <input className="input-custom" placeholder="123 Mauna Loa Street, Mililani, HI" value={form.address} onChange={e => update("address", e.target.value)} style={{ fontSize: 15 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 12, fontWeight: 600 }}>Neighborhood / Area</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                  {NEIGHBORHOODS.map(nh => (
                    <button key={nh} onClick={() => update("neighborhood", nh)} style={{ ...btnStyle(form.neighborhood === nh, BRAND.gold), padding: "11px 14px", textAlign: "left", fontSize: 13 }}>{nh}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 12, fontWeight: 600 }}>Property Type</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PROP_TYPES.map(pt => (
                    <button key={pt} onClick={() => update("propType", pt)} style={{ ...btnStyle(form.propType === pt, BRAND.teal), padding: "13px 22px", fontSize: 13, borderRadius: 2 }}>{pt}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 44, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={goNext} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px" }}>
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 className="font-display" style={{ fontSize: 30, marginBottom: 6 }}>Tell us about the home</h2>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 36 }}>More detail = more accurate estimate.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 12, fontWeight: 600 }}>Bedrooms</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => update("beds", n)} style={{ ...btnStyle(form.beds === n, BRAND.gold), width: 52, height: 52, fontSize: 16, fontWeight: 700, borderRadius: 2 }}>{n === 5 ? "5+" : n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 12, fontWeight: 600 }}>Bathrooms</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 1.5, 2, 2.5, 3, 3.5].map(n => (
                    <button key={n} onClick={() => update("baths", n)} style={{ ...btnStyle(form.baths === n, BRAND.gold), width: 62, height: 52, fontSize: 14, fontWeight: 700, borderRadius: 2 }}>{n === 3.5 ? "3.5+" : n}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 8, fontWeight: 600 }}>Square Footage</label>
                  <input className="input-custom" type="number" placeholder="1,200" value={form.sqft} onChange={e => update("sqft", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 8, fontWeight: 600 }}>Year Built</label>
                  <input className="input-custom" type="number" placeholder="1985" value={form.yearBuilt} onChange={e => update("yearBuilt", e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 12, fontWeight: 600 }}>Overall Condition</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CONDITIONS.map(c => (
                    <button key={c} onClick={() => update("condition", c)} style={{ ...btnStyle(form.condition === c, BRAND.teal), flex: "1 1 auto", padding: "12px 10px", fontSize: 12, textAlign: "center", minWidth: 80, borderRadius: 2 }}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 44, display: "flex", justifyContent: "space-between" }}>
              <button onClick={goBack} style={{ background: "none", border: `1px solid ${BRAND.border}`, color: BRAND.textMuted, padding: "13px 24px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", borderRadius: 2 }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="btn-primary" onClick={goNext} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px" }}>
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 className="font-display" style={{ fontSize: 30, marginBottom: 6 }}>Features & your info</h2>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 36 }}>Special features can significantly boost your estimate. Select all that apply.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 14, fontWeight: 600 }}>Special Features</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {FEATURES.map(f => {
                    const selected = form.features.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => toggleFeature(f.id)} style={{
                        padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: selected ? `${BRAND.teal}1A` : BRAND.bgCard,
                        border: `1px solid ${selected ? BRAND.teal : BRAND.border}`,
                        cursor: "pointer", transition: "all 0.18s", fontFamily: "'DM Sans', sans-serif", borderRadius: 2,
                      }}>
                        <span style={{ fontSize: 13, color: selected ? BRAND.teal : BRAND.textMuted, fontWeight: selected ? 600 : 400, textAlign: "left" }}>{f.label}</span>
                        {selected && <span style={{ fontSize: 11, color: BRAND.teal, fontWeight: 700, marginLeft: 8, whiteSpace: "nowrap" }}>{f.impact}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: "0.12em", color: BRAND.textMuted, textTransform: "uppercase", display: "block", marginBottom: 14, fontWeight: 600 }}>Your Contact Info</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input className="input-custom" placeholder="First Name" value={form.name} onChange={e => update("name", e.target.value)} />
                    <input className="input-custom" placeholder="Phone" value={form.phone} onChange={e => update("phone", e.target.value)} />
                  </div>
                  <input className="input-custom" placeholder="Email Address" value={form.email} onChange={e => update("email", e.target.value)} />
                  <select className="input-custom" value={form.timeline} onChange={e => update("timeline", e.target.value)}>
                    <option value="">When are you thinking of selling?</option>
                    <option>Within 3 months</option>
                    <option>3–6 months</option>
                    <option>6–12 months</option>
                    <option>Just curious about my home's value</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 44, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={goBack} style={{ background: "none", border: `1px solid ${BRAND.border}`, color: BRAND.textMuted, padding: "13px 24px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", borderRadius: 2 }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="btn-primary" onClick={goNext} style={{ padding: "15px 36px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
                Get My AI Estimate <Star size={14} />
              </button>
            </div>
            <p style={{ color: BRAND.textDim, fontSize: 11, textAlign: "center", marginTop: 16 }}>Your info is never sold or shared. Mel may reach out within 24 hrs.</p>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 24, fontWeight: 600 }}>AI Analyzing Your Property</div>
            <h2 className="font-display" style={{ fontSize: 34, marginBottom: 12 }}>Crunching the numbers...</h2>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 44, lineHeight: 1.7 }}>
              Comparing {form.neighborhood || "O'ahu"} sales · Adjusting for {form.propType || "property"} type · Applying {new Date().toLocaleString("default", { month: "long" })} market data
            </p>
            <div style={{ maxWidth: 420, margin: "0 auto", background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div className="ai-loading-bar" style={{ height: "100%", background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})`, borderRadius: 4 }} />
            </div>
            <div style={{ color: BRAND.textDim, fontSize: 12, marginTop: 16, letterSpacing: "0.08em" }}>Scanning 847 comparable O'ahu sales · Adjusting for features · Finalizing estimate</div>
          </div>
        )}

        {/* STEP 4 — RESULTS */}
        {step === 4 && result && !loading && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ color: BRAND.teal, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>AI Estimate Complete</div>
              <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 8 }}>Your Home's Estimated Value</h2>
              <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Based on {form.neighborhood || "O'ahu"} market data · {new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p>
            </div>

            {/* Main estimate card */}
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "48px 40px 40px", marginBottom: 20, position: "relative", overflow: "hidden", textAlign: "center" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})` }} />
              <div style={{ color: BRAND.textDim, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Estimated Value Range</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ color: BRAND.textMuted, fontSize: 22, fontWeight: 500 }}>{fmtPrice(result.low)}</span>
                <span style={{ color: BRAND.textDim, fontSize: 16 }}>—</span>
                <span style={{ color: BRAND.text, fontSize: "clamp(40px, 6vw, 60px)", fontWeight: 800, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1 }}>{fmtPrice(result.median)}</span>
                <span style={{ color: BRAND.textDim, fontSize: 16 }}>—</span>
                <span style={{ color: BRAND.textMuted, fontSize: 22, fontWeight: 500 }}>{fmtPrice(result.high)}</span>
              </div>
              <div style={{ color: BRAND.gold, fontSize: 13, fontWeight: 600, marginBottom: 36 }}>Median Estimated Value · {form.neighborhood || "O'ahu"}</div>
              {/* Confidence */}
              <div style={{ maxWidth: 380, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: BRAND.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Confidence Score</span>
                  <span style={{ fontSize: 13, color: BRAND.teal, fontWeight: 700 }}>{result.confidence}%</span>
                </div>
                <div style={{ height: 8, background: BRAND.bgElevated, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${result.confidence}%`, background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.gold})`, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: BRAND.textDim, marginTop: 8, textAlign: "center" }}>Accuracy improves with Mel's in-person walkthrough</div>
              </div>
            </div>

            {/* Value drivers */}
            <div style={{ background: BRAND.bgCard, border: `1px solid ${BRAND.border}`, padding: "28px 32px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp size={18} color={BRAND.teal} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: BRAND.text }}>Value Drivers</h3>
              </div>
              {result.drivers.map((d: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: i < result.drivers.length - 1 ? `1px solid ${BRAND.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: BRAND.textMuted }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: d.positive ? BRAND.teal : "#E07070" }}>{d.impact}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ background: `linear-gradient(135deg, ${BRAND.bg}, ${BRAND.bgCard})`, border: `1px solid ${BRAND.gold}44`, padding: "36px 40px", textAlign: "center" }}>
              <div style={{ color: BRAND.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>Next Step</div>
              <h3 className="font-display" style={{ fontSize: 26, marginBottom: 12 }}>Get Mel's Expert CMA</h3>
              <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 460, margin: "0 auto 28px" }}>
                An AI estimate is your starting point. Mel's free Comparative Market Analysis adds local expertise, actual buyer feedback, and a pricing strategy built around your goals.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:+18083885050" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Phone size={14} /> Call Mel · (808) 388-5050
                </a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLScxHvlGhr7mD8n-fjXwglrVsJe9xquMlb9qQFKa5V63UtOYRA/viewform?usp=sf_link" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: "none", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px" }}>
                  <FileText size={14} /> Request Full CMA ↗
                </a>
              </div>
            </div>

            <button onClick={() => { setStep(1); setResult(null); setLoading(false); setForm({ address: "", neighborhood: "", propType: "", beds: 0, baths: 0, sqft: "", yearBuilt: "", condition: "", features: [], name: "", email: "", phone: "", timeline: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "block", margin: "28px auto 0", background: "none", border: "none", color: BRAND.textDim, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              ↺ Start over with a different property
            </button>
          </div>
        )}
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
    <footer>
      {/* CTA Band */}
      <div style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})`, padding: "56px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#fff", marginBottom: 12, lineHeight: 1.15 }}>
            Let's Find Your Dream Home
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            Whether you're buying your first home, selling, or investing — Mel makes it personal.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => go("contact")} style={{ background: "#fff", color: BRAND.teal, borderRadius: 8 }}>Get in Touch</button>
            <a href="tel:8082858774" className="btn-outline" style={{ borderColor: "rgba(255,255,255,0.35)", color: "#fff", borderRadius: 8, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Phone size={14} /> (808) 285-8774
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div style={{ background: BRAND.bgDark, padding: "64px 24px 32px", color: "rgba(255,255,255,0.85)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 48 }}>
          {/* Brand + Agent */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <img src="/images/mel-headshot.jpg" alt="Mel" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Mel Castanares</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>REALTOR® | RS-#####</div>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Dream Home Realty Hawai'i<br/>O'ahu born & raised. Helping you find your dream home in paradise.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { Icon: Instagram, href: "https://www.instagram.com/mel.castanares" },
                { Icon: Facebook, href: "https://www.facebook.com/dreamhomehi" },
                { Icon: Linkedin, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}
                  onMouseEnter={e => e.currentTarget.style.background = BRAND.teal}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
                  <Icon size={16} color="#fff" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Explore</h4>
            {[
              { l: "Properties", p: "properties" }, { l: "Neighborhoods", p: "neighborhoods" },
              { l: "Market Data", p: "market" }, { l: "News", p: "blog" },
              { l: "About Mel", p: "about" }, { l: "Mortgage Calculator", p: "mortgage" },
            ].map((lk, i) => (
              <button key={i} onClick={() => go(lk.p)} style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans'", padding: 0, transition: "color 0.3s" }}
                onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.55)"}>{lk.l}</button>
            ))}
          </div>

          {/* Services */}
          <div>
            <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Services</h4>
            {[
              { l: "Buyer's Experience", p: "buyers" }, { l: "Seller's Experience", p: "sellers" },
              { l: "Home Valuation", p: "valuation" }, { l: "Relocation Guide", p: "relocation" },
              { l: "Testimonials", p: "testimonials" },
            ].map((lk, i) => (
              <button key={i} onClick={() => go(lk.p)} style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans'", padding: 0, transition: "color 0.3s" }}
                onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.55)"}>{lk.l}</button>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Contact</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <a href="tel:8082858774" style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${BRAND.teal}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={14} color={BRAND.tealLight} /></div>
                (808) 285-8774
              </a>
              <a href="mailto:mel@homesweethomehawaii.com" style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${BRAND.gold}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Mail size={14} color={BRAND.goldLight} /></div>
                mel@homesweethomehawaii.com
              </a>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MapPin size={14} color="rgba(255,255,255,0.5)" /></div>
                <span>Dream Home Realty Hawai'i<br/>95-1249 Meheula Pkwy #B-15B<br/>Mililani, HI 96789</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ maxWidth: 1400, margin: "0 auto", marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
            © {new Date().getFullYear()} Mel Castanares | Dream Home Realty Hawai'i LLC | RB-23566
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="https://www.dreamhomerealtyhawaii.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>dreamhomerealtyhawaii.com</a>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Privacy Policy</span>
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
          <a href="https://www.instagram.com/__mellio" target="_blank" rel="noopener noreferrer">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${BRAND.coral}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Instagram size={16} color={BRAND.coral} /></div>
            <div><div style={{ fontWeight: 600 }}>Instagram</div><div style={{ fontSize: 12, color: BRAND.textDim }}>@__mellio</div></div>
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
// APP — ROUTER WITH REAL URLS FOR SEO
// ─────────────────────────────────────────────

// Map page keys → URL paths (real URLs for Google indexing)
const PAGE_ROUTES: Record<string, string> = {
  home: "/",
  about: "/about",
  properties: "/listings",
  "property-detail": "/listings/detail",
  neighborhoods: "/neighborhoods",
  market: "/market-insights",
  blog: "/resources",
  "blog-post": "/resources/article",
  contact: "/contact",
  buyers: "/buyers",
  sellers: "/sellers",
  valuation: "/home-valuation",
  mortgage: "/mortgage-calculator",
  relocation: "/relocation",
  testimonials: "/testimonials",
};

const ROUTE_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([k, v]) => [v, k])
);

const PAGE_META: Record<string, { title: string; description: string }> = {
  home: {
    title: "Mel Castanares | O'ahu REALTOR® | Mililani & Central Oahu Real Estate",
    description: "Mel Castanares (RS-84753) is an O'ahu-born REALTOR® at Dream Home Realty Hawai'i. Specializing in Mililani, Waipahu, Kapolei, and Central Oahu. Call (808) 285-8774.",
  },
  about: {
    title: "About Mel Castanares | O'ahu Mama REALTOR® | License RS-84753",
    description: "Meet Mel Castanares — O'ahu-born REALTOR®, property management expert, and mama who guides families through buying, selling, and investing in Hawai'i real estate.",
  },
  properties: {
    title: "O'ahu Homes for Sale & Rent | Listings | Mel Castanares Real Estate",
    description: "Browse active homes for sale and rent across O'ahu. From Mililani family homes to Kāne'ohe rentals. Contact Mel Castanares at (808) 285-8774.",
  },
  neighborhoods: {
    title: "O'ahu Neighborhoods Guide | Mililani, Kailua, Ewa Beach & More | Mel Castanares",
    description: "Explore O'ahu neighborhoods with local insights on schools, parks, commutes, and home prices. Mel's specialty: Central & West O'ahu — Mililani, Kapolei, Pearl City.",
  },
  market: {
    title: "O'ahu Real Estate Market Trends 2026 | Mel Castanares",
    description: "Current O'ahu real estate market data: median prices, inventory levels, days on market, and Mel's honest analysis of what it means for buyers and sellers.",
  },
  blog: {
    title: "Hawai'i Real Estate Resources & Blog | Mel Castanares",
    description: "Honest real estate advice for O'ahu buyers, sellers, and investors. Market updates, first-time buyer guides, neighborhood comparisons, and more.",
  },
  contact: {
    title: "Contact Mel Castanares | O'ahu REALTOR® | (808) 285-8774",
    description: "Get in touch with Mel Castanares, REALTOR® RS-84753 at Dream Home Realty Hawai'i. Phone: (808) 285-8774. Office: 95-1249 Meheula Parkway, Mililani, HI.",
  },
  buyers: {
    title: "Buyer's Guide | Buying a Home in O'ahu | Mel Castanares",
    description: "Your step-by-step guide to buying a home in Hawai'i with Mel Castanares. From pre-approval to closing — honest, family-focused guidance.",
  },
  sellers: {
    title: "Seller's Guide | Sell Your O'ahu Home | Mel Castanares",
    description: "Strategic home selling on O'ahu with Mel Castanares. Professional marketing, accurate pricing, and fierce negotiation to maximize your return.",
  },
  valuation: {
    title: "Free Home Valuation | What's Your O'ahu Home Worth? | Mel Castanares",
    description: "Get a free, no-obligation home valuation from Mel Castanares. Accurate O'ahu home values based on real comparable sales and current market conditions.",
  },
  mortgage: {
    title: "O'ahu Mortgage Calculator | Estimate Your Payment | Mel Castanares",
    description: "Calculate your monthly mortgage payment for an O'ahu home. Includes principal, interest, property tax, insurance, and HOA — plus Mel's lender recommendations.",
  },
  relocation: {
    title: "Relocating to Hawai'i | O'ahu Relocation Guide | Mel Castanares",
    description: "Everything you need to know about moving to O'ahu. Cost of living, schools, logistics, and local tips from Mel Castanares who has helped dozens of families relocate.",
  },
  testimonials: {
    title: "Client Reviews | What Mel's Clients Say | Mel Castanares REALTOR®",
    description: "Read real client reviews and testimonials for Mel Castanares, O'ahu REALTOR®. From first-time buyers to seasoned investors — 100% client satisfaction.",
  },
};

export default function App() {
  const [page, setPage] = useState(() => {
    // Initialize from URL on first load
    const path = window.location.pathname;
    return ROUTE_PAGES[path] || "home";
  });

  // Sync URL ↔ page state
  useEffect(() => {
    const path = PAGE_ROUTES[page] || "/";
    const meta = PAGE_META[page] || PAGE_META.home;

    // Push URL to browser history
    if (window.location.pathname !== path) {
      window.history.pushState({ page }, "", path);
    }

    // Update page title and meta description for SEO
    document.title = meta.title;
    let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.name = "description";
      document.head.appendChild(descEl);
    }
    descEl.content = meta.description;

    // og:title + og:description
    ["og:title", "twitter:title"].forEach(prop => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = meta.title;
    });
    ["og:description", "twitter:description"].forEach(prop => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = meta.description;
    });

    // og:url
    let urlEl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!urlEl) { urlEl = document.createElement("meta"); urlEl.setAttribute("property", "og:url"); document.head.appendChild(urlEl); }
    urlEl.content = `https://melcastanares.techsavvyhawaii.com${path}`;

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `https://melcastanares.techsavvyhawaii.com${path}`;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [page]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const path = window.location.pathname;
      const p = ROUTE_PAGES[path] || "home";
      setPage(p);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={setPage} />;
      case "properties": return <PropertiesPage setPage={setPage} />;
      case "property-detail": return <PropertyDetailPage setPage={setPage} />;
      case "about": return <AboutPage setPage={setPage} />;
      case "neighborhoods": return <NeighborhoodsPage setPage={setPage} />;
      case "neighborhood-detail": return <NeighborhoodDetailPage setPage={setPage} />;
      case "market": return <MarketPage />;
      case "blog": return <BlogPage setPage={setPage} />;
      case "blog-post": return <BlogPostPage setPage={setPage} />;
      case "contact": return <ContactPage />;
      case "buyers": return <BuyersPage setPage={setPage} />;
      case "sellers": return <SellersPage setPage={setPage} />;
      case "valuation": return <ValuationPage />;
      case "mortgage": return <MortgageCalculatorPage setPage={setPage} />;
      case "relocation": return <RelocationPage setPage={setPage} />;
      case "testimonials": return <AboutPage setPage={setPage} />;
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
