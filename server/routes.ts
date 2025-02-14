import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEntrySchema, updateEntrySchema, insertChatMessageSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { generateChatResponse } from "./openai";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import express from "express";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Configure express to handle larger payloads for audio files
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  app.get("/api/question", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const question = storage.getDailyQuestion(new Date());
    res.json({ question });
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
    const entry = await storage.getEntry(req.user.id, entryId);
    if (!entry) {
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

  app.post("/api/transcribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const tempFilePath = `/tmp/audio-${Date.now()}.webm`;

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(req.body.audio, 'base64');

      // Write to temp file
      await writeFile(tempFilePath, buffer);

      const transcription = await openai.audio.transcriptions.create({
        file: await import('fs').then(fs => fs.createReadStream(tempFilePath)),
        model: "whisper-1",
      });

      // Clean up temp file
      await unlink(tempFilePath);

      res.json({ text: transcription.text });
    } catch (error) {
      console.error('Transcription error:', error);
      // Attempt to clean up the temp file even if there was an error
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}