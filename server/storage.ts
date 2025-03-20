import { 
  User, InsertUser, Entry, InsertEntry, InsertChatMessage, ChatMessage,
  InsertAnalysis, Analysis, users, entries, chatMessages, analyses
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, isNull, lt, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";
import { getNextQuestion } from './sheets.js';

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
  
  // Analysis related methods
  getUnanalyzedEntriesCount(userId: number): Promise<number>;
  getUnanalyzedEntries(userId: number): Promise<Entry[]>;
  createAnalysis(userId: number, analysis: InsertAnalysis): Promise<Analysis>;
  getAnalyses(userId: number): Promise<Analysis[]>;
  getAnalysis(userId: number, id: number): Promise<Analysis | undefined>;
  markEntriesAsAnalyzed(userId: number, entryIds: number[]): Promise<void>;
  updateUserLastAnalysisTime(userId: number): Promise<void>;
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
  
  async getUnanalyzedEntriesCount(userId: number): Promise<number> {
    let query = db
      .select({ count: db.fn.count() })
      .from(entries)
      .where(and(
        eq(entries.userId, userId),
        isNull(entries.analyzedAt)
      ));
      
    const result = await query;
    
    // Handle different formats of count results that Postgres might return
    if (result && result.length > 0) {
      const countValue = result[0].count;
      if (countValue === null || countValue === undefined) {
        return 0;
      }
      
      // The count could be returned as string, number, or bigint
      return typeof countValue === 'number' 
        ? countValue 
        : parseInt(String(countValue));
    }
    
    return 0;
  }
  
  async getUnanalyzedEntries(userId: number): Promise<Entry[]> {
    return await db
      .select()
      .from(entries)
      .where(and(
        eq(entries.userId, userId),
        isNull(entries.analyzedAt)
      ))
      .orderBy(entries.createdAt);
  }
  
  async createAnalysis(userId: number, analysis: InsertAnalysis): Promise<Analysis> {
    const [created] = await db
      .insert(analyses)
      .values({
        ...analysis,
        userId
      })
      .returning();
    return created;
  }
  
  async getAnalyses(userId: number): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }
  
  async getAnalysis(userId: number, id: number): Promise<Analysis | undefined> {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(and(
        eq(analyses.userId, userId),
        eq(analyses.id, id)
      ));
    return analysis;
  }
  
  async markEntriesAsAnalyzed(userId: number, entryIds: number[]): Promise<void> {
    const now = new Date();
    await db
      .update(entries)
      .set({ analyzedAt: now })
      .where(and(
        eq(entries.userId, userId),
        entries.id.in(entryIds)
      ));
  }
  
  async updateUserLastAnalysisTime(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastAnalysisAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();