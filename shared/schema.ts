import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEntrySchema = createInsertSchema(entries)
  .pick({
    question: true,
    answer: true,
    date: true,
  })
  .extend({
    date: z.coerce.date(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type User = typeof users.$inferSelect;
export type Entry = typeof entries.$inferSelect;
