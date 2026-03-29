import { integer, numeric, pgTable, real, timestamp, uuid } from "drizzle-orm/pg-core";

export const stats = pgTable("stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  homesSold: integer("homes_sold").notNull().default(0),
  totalSalesVolume: numeric("total_sales_volume", { precision: 14, scale: 2 }),
  yearsExperience: integer("years_experience").notNull().default(0),
  clientSatisfactionRate: real("client_satisfaction_rate").notNull().default(100),
  averageDaysOnMarket: integer("average_days_on_market"),
  listToSaleRatio: real("list_to_sale_ratio"),
  neighborhoodsServed: integer("neighborhoods_served"),
  awardsCount: integer("awards_count"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
