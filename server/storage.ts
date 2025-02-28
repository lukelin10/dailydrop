import { User, InsertUser, Entry, InsertEntry, InsertChatMessage, ChatMessage, users, entries, chatMessages } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { getNextQuestion } from './sheets';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEntry(userId: number, entry: InsertEntry): Promise<Entry>;
  getEntries(userId: number): Promise<Entry[]>;
  getEntry(userId: number, id: number): Promise<Entry | undefined>;
  updateEntry(userId: number, id: number, updates: Partial<Entry>): Promise<Entry>;
  getEntryByShareId(shareId: string): Promise<Entry | undefined>;
  sessionStore: session.Store;
  getDailyQuestion(date: Date): Promise<string>;
  createChatMessage(message: InsertChatMessage & { userId: number }): Promise<ChatMessage>;
  getChatMessages(entryId: number): Promise<ChatMessage[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createEntry(userId: number, insertEntry: InsertEntry): Promise<Entry> {
    const entry = {
      userId,
      ...insertEntry,
      isPublic: false,
      shareId: null,
      date: new Date().toISOString(), // Convert Date to string format
    };
    const [created] = await db.insert(entries).values(entry).returning();
    return created;
  }

  async getEntries(userId: number): Promise<Entry[]> {
    return await db.select().from(entries).where(eq(entries.userId, userId));
  }

  async getEntry(userId: number, id: number): Promise<Entry | undefined> {
    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)));
    return entry;
  }

  async updateEntry(userId: number, id: number, updates: Partial<Entry>): Promise<Entry> {
    const [updated] = await db
      .update(entries)
      .set(updates)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return updated;
  }

  async getEntryByShareId(shareId: string): Promise<Entry | undefined> {
    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.shareId, shareId));
    return entry;
  }

  async getDailyQuestion(date: Date): Promise<string> {
    try {
      return await getNextQuestion();
    } catch (error) {
      const FALLBACK_QUESTIONS = [
        "What small moment from today made you smile?",
        "What's something you feel is seeking you?",
        "What's a little detail in your daily routine that you really enjoy?",
        "What's one thing you learned recently?",
        "What are you grateful for today?",
        "What's challenging you right now?",
        "What's something you're looking forward to?",
        "What's a small win you had today?",
        "What's something that inspired you recently?",
        "What's a goal you're working towards?",
        "What made today unique?",
        "What's something you'd like to improve?"
      ];
      const dayOfYear = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
      return FALLBACK_QUESTIONS[dayOfYear % FALLBACK_QUESTIONS.length];
    }
  }

  async createChatMessage(message: InsertChatMessage & { userId: number }): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getChatMessages(entryId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.entryId, entryId))
      .orderBy(chatMessages.createdAt);
  }
}

export const storage = new DatabaseStorage();