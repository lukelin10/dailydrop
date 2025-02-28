import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { insertEntrySchema, updateEntrySchema, insertChatMessageSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { generateChatResponse } from "./openai";
import { getCurrentQuestion, setQuestionIndex } from "./sheets";
import { z } from "zod";

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
      // Pass a Date object, but the function will convert it to string if needed
      const question = await storage.getDailyQuestion(new Date());
      res.json({ question });
    } catch (error) {
      console.error("Error fetching daily question:", error);
      res.status(500).json({ message: "Failed to fetch daily question" });
    }
  });

  // New endpoint to get current question without incrementing
  app.get("/api/question/current", async (req, res) => {
    try {
      const question = await getCurrentQuestion();
      res.json({ question, currentIndex: true });
    } catch (error) {
      console.error("Error fetching current question:", error);
      res.status(500).json({ message: "Failed to fetch current question" });
    }
  });

  // New endpoint to reset question index
  app.post("/api/question/reset", async (req, res) => {
    const schema = z.object({
      index: z.number().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid index. Must be a number greater than 0." });
    }

    try {
      setQuestionIndex(parsed.data.index);
      const question = await getCurrentQuestion();
      res.json({ message: "Question index reset successfully", currentIndex: parsed.data.index, question });
    } catch (error) {
      console.error("Error resetting question index:", error);
      res.status(500).json({ message: "Failed to reset question index" });
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