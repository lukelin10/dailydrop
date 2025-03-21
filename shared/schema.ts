/**
 * Database schema definition using Drizzle ORM
 * This file defines the structure of all database tables and relationships.
 */
import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Users table - stores authentication and user profile information
 * 
 * Important fields:
 * - id: Unique identifier for the user
 * - username: Unique username (typically the Firebase UID)
 * - lastAnalysisAt: Timestamp of when the user last generated an analysis
 *                   Used to determine eligibility for new analyses
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  lastAnalysisAt: timestamp("last_analysis_at"),
});

/**
 * Entries table - stores the daily journal entries ("drops")
 * 
 * Important fields:
 * - userId: Links the entry to a specific user
 * - question: The prompt/question that was answered
 * - answer: The user's journal entry text
 * - date: The date this entry is associated with
 * - isPublic: Whether this entry can be shared publicly
 * - shareId: A unique ID used for public sharing (only set if isPublic=true)
 * - analyzedAt: When this entry was last included in an analysis
 *              null indicates the entry hasn't been analyzed yet
 */
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  questionId: integer("question_id").notNull(), // ID of the question from Google Sheets
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublic: boolean("is_public").notNull().default(false),
  shareId: text("share_id"), // Unique sharing ID, null if not shared
  analyzedAt: timestamp("analyzed_at"), // When this entry was last included in an analysis
});

/**
 * Chat Messages table - stores the conversation between user and AI about entries
 * 
 * Important fields:
 * - entryId: Links the message to a specific journal entry
 * - userId: The user who owns this message
 * - content: The text content of the message
 * - isBot: Whether this message is from the AI (true) or the user (false)
 */
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Analyses table - stores AI-generated analyses of journal entries
 * 
 * Each analysis is created when a user has enough unanalyzed entries (7+)
 * 
 * Important fields:
 * - userId: The user who owns this analysis
 * - content: The AI-generated analysis text
 * - entryCount: Number of entries included in this analysis
 * - createdAt: When this analysis was generated
 */
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  entryCount: integer("entry_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Schema for validating user creation requests
 * Used with Zod for validating user registration
 */
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

/**
 * Schema for validating new journal entry creation
 * Picks only the fields that should be provided by the client
 * Adds special handling for date field to coerce string to Date object
 */
export const insertEntrySchema = createInsertSchema(entries)
  .pick({
    question: true,
    answer: true,
    date: true,
    questionId: true,
  })
  .extend({
    date: z.coerce.date(), // Converts string dates to Date objects
  });

/**
 * Schema for validating entry update requests
 * Currently only supporting updating the public status
 */
export const updateEntrySchema = z.object({
  isPublic: z.boolean(),
});

/**
 * Schema for validating new chat message creation
 * Picks only the fields that should be provided by the client
 * Extends with entryId to link message to specific entry
 */
export const insertChatMessageSchema = createInsertSchema(chatMessages)
  .pick({
    content: true,
    isBot: true,
  })
  .extend({
    entryId: z.number(),
  });

/**
 * Schema for validating new analysis creation
 * Picks only the fields that should be provided when creating an analysis
 */
export const insertAnalysisSchema = createInsertSchema(analyses)
  .pick({
    content: true,
    entryCount: true,
  });

/**
 * Type definitions for use throughout the application
 * 
 * Insert* types are used for creating new records
 * The other types represent the full database record with all fields
 */
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type User = typeof users.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;