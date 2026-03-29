import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inquiryTypeEnum = pgEnum("inquiry_type", ["buy", "sell", "rent", "invest", "valuation", "general"]);
export const contactStatusEnum = pgEnum("contact_status", ["new", "contacted", "qualified", "closed", "archived"]);

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  inquiryType: inquiryTypeEnum("inquiry_type").notNull().default("general"),
  budget: text("budget"),
  timeline: text("timeline"),
  propertyId: uuid("property_id"),
  status: contactStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
