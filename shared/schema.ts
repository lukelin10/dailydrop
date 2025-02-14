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
  isPublic: boolean("is_public").notNull().default(false),
  shareId: text("share_id").unique(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull(),
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

export const updateEntrySchema = z.object({
  isPublic: z.boolean(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages)
  .pick({
    content: true,
    isBot: true,
  })
  .extend({
    entryId: z.number(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type User = typeof users.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;