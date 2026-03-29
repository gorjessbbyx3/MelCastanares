import { integer, json, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const agent = pgTable("agent", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull(),
  shortBio: text("short_bio"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  instagram: text("instagram"),
  facebook: text("facebook"),
  linkedin: text("linkedin"),
  photoUrl: text("photo_url"),
  coverPhotoUrl: text("cover_photo_url"),
  licenseNumber: text("license_number"),
  brokerage: text("brokerage"),
  brokerageAddress: text("brokerage_address"),
  specialties: json("specialties").$type<string[]>().default([]),
  certifications: json("certifications").$type<string[]>().default([]),
  serviceAreas: json("service_areas").$type<string[]>().default([]),
  awardsAndRecognition: json("awards_and_recognition").$type<string[]>().default([]),
  yearsExperience: integer("years_experience"),
});
