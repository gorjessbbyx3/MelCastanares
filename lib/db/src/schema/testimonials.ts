import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const testimonialTransactionTypeEnum = pgEnum("testimonial_transaction_type", ["buy", "sell", "both", "rent", "invest"]);

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientName: text("client_name").notNull(),
  clientPhoto: text("client_photo"),
  rating: integer("rating").notNull().default(5),
  quote: text("quote").notNull(),
  propertyAddress: text("property_address"),
  transactionType: testimonialTransactionTypeEnum("transaction_type").notNull().default("buy"),
  date: text("date"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
