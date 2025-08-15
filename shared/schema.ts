import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const categorizations = pgTable("categorizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageData: text("image_data").notNull(), // base64 encoded image
  category: text("category").notNull(), // tetoman, egenman, tetowoman, egenwoman
  message: text("message").notNull(),
  funFacts: jsonb("fun_facts").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCategorizationSchema = createInsertSchema(categorizations).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Categorization = typeof categorizations.$inferSelect;
export type InsertCategorization = z.infer<typeof insertCategorizationSchema>;
