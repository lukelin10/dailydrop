import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEntrySchema, updateEntrySchema, insertChatMessageSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { generateChatResponse } from "./openai";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/entries", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const entries = await storage.getEntries(req.user.id);
    res.json(entries);
  });

  app.post("/api/entries", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const entry = await storage.createEntry(req.user.id, parsed.data);
    res.status(201).json(entry);
  });

  app.get("/api/question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const question = await storage.getDailyQuestion(new Date());
      res.json({ question });
    } catch (error) {
      console.error("Error fetching daily question:", error);
      res.status(500).json({ message: "Failed to fetch daily question" });
    }
  });

  app.patch("/api/entries/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const entry = await storage.getEntry(req.user.id, parseInt(req.params.id));
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const shareId = parsed.data.isPublic ? nanoid() : null;
    const updated = await storage.updateEntry(req.user.id, parseInt(req.params.id), {
      isPublic: parsed.data.isPublic,
      shareId,
    });

    res.json(updated);
  });

  app.get("/api/shared/:shareId", async (req, res) => {
    const entry = await storage.getEntryByShareId(req.params.shareId);
    if (!entry || !entry.isPublic) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.json(entry);
  });

  app.post("/api/clear-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.clearAllData();
    res.sendStatus(200);
  });

  // Chat endpoints
  app.get("/api/entries/:id/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const entryId = parseInt(req.params.id);
    const entry = await storage.getEntry(req.user.id, entryId);
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const messages = await storage.getChatMessages(entryId);
    res.json(messages);
  });

  app.post("/api/entries/:id/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const entryId = parseInt(req.params.id);
    console.log('[express] Chat message received:', { entryId, body: req.body });
    
    const entry = await storage.getEntry(req.user.id, entryId);
    if (!entry) {
      console.log('[express] Entry not found:', { entryId, userId: req.user.id });
      return res.status(404).json({ message: "Entry not found" });
    }

    const parsed = insertChatMessageSchema.safeParse({
      ...req.body,
      entryId,
    });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Create user message
    const userMessage = await storage.createChatMessage({
      ...parsed.data,
      userId: req.user.id,
    });

    // Get conversation history
    const messages = await storage.getChatMessages(entryId);
    const conversationHistory = messages.map((msg): { role: "user" | "assistant"; content: string } => ({
      role: msg.isBot ? "assistant" : "user",
      content: msg.content
    }));

    try {
      // Generate AI response
      const botResponse = await generateChatResponse(
        parsed.data.content,
        conversationHistory
      );

      if (botResponse) {
        // Create bot message
        const botMessage = await storage.createChatMessage({
          content: botResponse,
          entryId,
          isBot: true,
          userId: req.user.id,
        });

        res.json([userMessage, botMessage]);
      } else {
        res.json([userMessage]);
      }
    } catch (error) {
      console.error("Error generating chat response:", error);
      res.json([userMessage]);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}