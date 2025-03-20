/**
 * Storage Module
 * 
 * This module is responsible for all database operations in the application.
 * It provides a consistent interface for data access through the IStorage interface.
 * 
 * The primary implementation is the DatabaseStorage class which uses Drizzle ORM
 * to interact with a PostgreSQL database.
 */
import { 
  User, InsertUser, Entry, InsertEntry, InsertChatMessage, ChatMessage,
  InsertAnalysis, Analysis, users, entries, chatMessages, analyses
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, isNull, lt, desc, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";
import { getNextQuestion } from './sheets.js';

const PostgresSessionStore = connectPg(session);

/**
 * Storage Interface Definition
 * 
 * Defines all data access methods for the application.
 * Implementation must handle data persistence for all entities.
 */
export interface IStorage {
  /**
   * Get a user by their ID
   */
  getUser(id: number): Promise<User | undefined>;
  
  /**
   * Get a user by their username (typically the Firebase UID)
   */
  getUserByUsername(username: string): Promise<User | undefined>;
  
  /**
   * Create a new user
   */
  createUser(user: InsertUser): Promise<User>;
  
  /**
   * Create a new journal entry for a user
   */
  createEntry(userId: number, entry: InsertEntry): Promise<Entry>;
  
  /**
   * Get all entries for a user
   */
  getEntries(userId: number): Promise<Entry[]>;
  
  /**
   * Get a specific entry by ID (with user ownership check)
   */
  getEntry(userId: number, id: number): Promise<Entry | undefined>;
  
  /**
   * Update a specific entry
   */
  updateEntry(userId: number, id: number, updates: Partial<Entry>): Promise<Entry>;
  
  /**
   * Get an entry by its share ID (for public sharing)
   */
  getEntryByShareId(shareId: string): Promise<Entry | undefined>;
  
  /**
   * Session store for user authentication sessions
   */
  sessionStore: session.Store;
  
  /**
   * Get the daily journaling question
   */
  getDailyQuestion(date: Date): Promise<string>;
  
  /**
   * Create a new chat message for an entry
   */
  createChatMessage(message: InsertChatMessage & { userId: number }): Promise<ChatMessage>;
  
  /**
   * Get all chat messages for an entry
   */
  getChatMessages(entryId: number): Promise<ChatMessage[]>;
  
  // ----- Analysis related methods -----
  
  /**
   * Count unanalyzed entries for a user
   * 
   * Used to determine if a user has enough entries (7+) to generate an analysis
   */
  getUnanalyzedEntriesCount(userId: number): Promise<number>;
  
  /**
   * Get all unanalyzed entries for a user
   * 
   * These entries will be used for generating the AI analysis
   */
  getUnanalyzedEntries(userId: number): Promise<Entry[]>;
  
  /**
   * Create a new analysis
   * 
   * Stores the AI-generated analysis content
   */
  createAnalysis(userId: number, analysis: InsertAnalysis): Promise<Analysis>;
  
  /**
   * Get all analyses for a user
   * 
   * Returns sorted by creation date in descending order (newest first)
   */
  getAnalyses(userId: number): Promise<Analysis[]>;
  
  /**
   * Get a specific analysis by ID
   */
  getAnalysis(userId: number, id: number): Promise<Analysis | undefined>;
  
  /**
   * Mark entries as analyzed
   * 
   * Sets the analyzedAt timestamp on entries after they've been analyzed
   * to prevent them from being included in future analyses
   */
  markEntriesAsAnalyzed(userId: number, entryIds: number[]): Promise<void>;
  
  /**
   * Update the last analysis time for a user
   * 
   * Sets the lastAnalysisAt timestamp on the user
   * (could be used for rate limiting or analysis frequency tracking)
   */
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
  
  /**
   * Count unanalyzed entries for a specific user
   * 
   * This method is used to determine if a user has enough entries (>=7)
   * to generate a new analysis. Only entries that haven't been analyzed
   * (where analyzedAt is null) are counted.
   * 
   * Note: Currently hardcoded to return 0 for testing purposes.
   * The real implementation would return result.length.
   * 
   * @param userId The ID of the user to count entries for
   * @returns The count of unanalyzed entries
   */
  async getUnanalyzedEntriesCount(userId: number): Promise<number> {
    try {
      // Check if user exists first
      const user = await this.getUser(userId);
      if (!user) {
        console.log('User not found in getUnanalyzedEntriesCount:', userId);
        return 0;
      }
      
      // Log the request for debugging
      console.log(`Counting unanalyzed entries for user ${userId}`);

      // Use Drizzle ORM for the query instead of raw SQL
      const result = await db
        .select()
        .from(entries)
        .where(and(
          eq(entries.userId, userId),
          isNull(entries.analyzedAt)
        ));
      
      // For debugging purposes, log the entries found
      console.log(`Found ${result.length} unanalyzed entries for user ${userId}:`, 
        result.map(e => ({ id: e.id, date: e.date })));
      
      // Return the actual count of unanalyzed entries
      return result.length;
    } catch (error) {
      console.error('Error in getUnanalyzedEntriesCount:', error);
      return 0;
    }
  }
  
  /**
   * Get all unanalyzed entries for a user
   * 
   * Retrieves entries that haven't been included in an analysis yet.
   * These will be used to generate a new analysis.
   * 
   * @param userId The ID of the user
   * @returns Array of unanalyzed entries, sorted by creation date
   */
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
  
  /**
   * Create a new analysis record
   * 
   * Stores the AI-generated analysis and associates it with the user.
   * 
   * @param userId The ID of the user who owns this analysis
   * @param analysis The analysis data to insert
   * @returns The newly created analysis
   */
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
  
  /**
   * Get all analyses for a user
   * 
   * Retrieves all past analyses for a user, sorted newest first
   * 
   * @param userId The ID of the user
   * @returns Array of analysis records
   */
  async getAnalyses(userId: number): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }
  
  /**
   * Get a specific analysis by ID
   * 
   * Retrieves a single analysis with ownership verification
   * 
   * @param userId The ID of the user who owns the analysis
   * @param id The ID of the analysis to retrieve
   * @returns The requested analysis or undefined if not found
   */
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
  
  /**
   * Mark entries as analyzed
   * 
   * Sets the analyzedAt timestamp on entries that were included in an analysis
   * This prevents them from being included in future analyses
   * 
   * @param userId The ID of the user who owns the entries
   * @param entryIds Array of entry IDs to mark as analyzed
   */
  async markEntriesAsAnalyzed(userId: number, entryIds: number[]): Promise<void> {
    const now = new Date();
    await db
      .update(entries)
      .set({ analyzedAt: now })
      .where(and(
        eq(entries.userId, userId),
        inArray(entries.id, entryIds)
      ));
  }
  
  /**
   * Update the last analysis time for a user
   * 
   * Sets the lastAnalysisAt timestamp on the user record
   * This can be used to enforce time-based limits on analysis creation
   * 
   * @param userId The ID of the user to update
   */
  async updateUserLastAnalysisTime(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastAnalysisAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();