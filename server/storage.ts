import { User, InsertUser, Entry, InsertEntry } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEntry(userId: number, entry: InsertEntry): Promise<Entry>;
  getEntries(userId: number): Promise<Entry[]>;
  getEntry(userId: number, id: number): Promise<Entry | undefined>;
  sessionStore: session.Store;
}

const QUESTIONS = [
  "What made you smile today?",
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private entries: Map<number, Entry>;
  private currentUserId: number;
  private currentEntryId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.entries = new Map();
    this.currentUserId = 1;
    this.currentEntryId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { id, ...insertUser };
    this.users.set(id, user);
    return user;
  }

  async createEntry(userId: number, insertEntry: InsertEntry): Promise<Entry> {
    const id = this.currentEntryId++;
    const entry = {
      id,
      userId,
      ...insertEntry,
      createdAt: new Date(),
    };
    this.entries.set(id, entry);
    return entry;
  }

  async getEntries(userId: number): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.userId === userId,
    );
  }

  async getEntry(userId: number, id: number): Promise<Entry | undefined> {
    const entry = this.entries.get(id);
    if (entry?.userId !== userId) return undefined;
    return entry;
  }

  getDailyQuestion(date: Date): string {
    const dayOfYear = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    return QUESTIONS[dayOfYear % QUESTIONS.length];
  }
}

export const storage = new MemStorage();
