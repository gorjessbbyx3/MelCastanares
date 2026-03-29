import { boolean, integer, json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content"),
  author: text("author").notNull(),
  coverImage: text("cover_image"),
  category: text("category"),
  tags: json("tags").$type<string[]>().default([]),
  featured: boolean("featured").default(false),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  readTime: integer("read_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
