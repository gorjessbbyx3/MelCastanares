import { boolean, integer, json, numeric, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const propertyStatusEnum = pgEnum("property_status", ["active", "pending", "sold", "off_market"]);
export const propertyTypeEnum = pgEnum("property_type", ["single_family", "condo", "townhome", "multi_family", "land", "commercial"]);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  mlsNumber: text("mls_number"),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  status: propertyStatusEnum("status").notNull().default("active"),
  type: propertyTypeEnum("type").notNull().default("single_family"),
  featured: boolean("featured").default(false),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip"),
  neighborhood: text("neighborhood"),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: real("bathrooms").notNull(),
  sqft: integer("sqft").notNull(),
  lotSize: real("lot_size"),
  yearBuilt: integer("year_built"),
  garage: integer("garage"),
  images: json("images").$type<{ url: string; isPrimary?: boolean; caption?: string }[]>().default([]),
  amenities: json("amenities").$type<string[]>().default([]),
  virtualTourUrl: text("virtual_tour_url"),
  listingDate: text("listing_date"),
  soldDate: text("sold_date"),
  soldPrice: numeric("sold_price", { precision: 12, scale: 2 }),
  openHouseDate: text("open_house_date"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  crmId: text("crm_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
