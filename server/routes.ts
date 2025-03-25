/**
 * API Routes Module
 * 
 * This module defines all API endpoints for the application, including:
 * - Authentication routes (through setupAuth)
 * - Journal entry management
 * - Daily question retrieval
 * - Chat functionality
 * - Analysis generation
 * - Public sharing functionality
 * 
 * Each endpoint follows a consistent pattern:
 * 1. Authentication verification (for protected routes)
 * 2. Input validation using Zod schemas
 * 3. Business logic execution using storage interface
 * 4. Response formatting and error handling
 */
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { insertEntrySchema, updateEntrySchema, insertChatMessageSchema, insertAnalysisSchema } from "../shared/schema.js";
import { nanoid } from "nanoid";
import { generateChatResponse, generateAnalysis } from "./openai.js";
import { getCurrentQuestion, setQuestionIndex } from "./sheets.js";
import { z } from "zod";

/**
 * Register all API routes with the Express application
 * 
 * @param app - Express application instance
 * @returns HTTP server instance
 */
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

  /**
   * Get Daily Question
   * 
   * GET /api/question
   * 
   * Retrieves the daily journaling question for the current day.
   * Each day, a new question is presented based on the incremented index.
   * Requires authentication.
   * 
   * @returns Question text and ID
   */
  app.get("/api/question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Pass a Date object, but the function will convert it to string if needed
      const questionData = await storage.getDailyQuestion(new Date());
      res.json(questionData);
    } catch (error) {
      console.error("Error fetching daily question:", error);
      res.status(500).json({ message: "Failed to fetch daily question" });
    }
  });

  /**
   * Get Current Question Without Incrementing
   * 
   * GET /api/question/current
   * 
   * Returns the current question without incrementing the index.
   * Used for debugging or administrative purposes to check the current 
   * question without affecting the sequence.
   * 
   * @returns Current question with flag indicating it's the current index
   */
  app.get("/api/question/current", async (req, res) => {
    try {
      const question = await getCurrentQuestion();
      res.json({ question, currentIndex: true });
    } catch (error) {
      console.error("Error fetching current question:", error);
      res.status(500).json({ message: "Failed to fetch current question" });
    }
  });

  /**
   * Reset Question Index
   * 
   * POST /api/question/reset
   * 
   * Allows administrators to manually set the question index to a specific value.
   * This can be used to restart the sequence or jump to a specific question.
   * 
   * @param index - The question index to set (must be > 0)
   * @returns Success message with the new current index and question
   */
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

    const shareId = parsed.data.isPublic ? nanoid() : "";
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
      console.error('[express] Invalid chat message schema:', parsed.error);
      return res.status(400).json(parsed.error);
    }

    console.log('[express] Creating user message:', parsed.data);
    
    // Create user message
    const userMessage = await storage.createChatMessage({
      ...parsed.data,
      userId: req.user.id,
    });
    
    console.log('[express] User message created:', userMessage);

    // Get conversation history
    const messages = await storage.getChatMessages(entryId);
    console.log('[express] Got conversation history, message count:', messages.length);
    
    const conversationHistory = messages.map((msg): { role: "user" | "assistant"; content: string } => ({
      role: msg.isBot ? "assistant" : "user",
      content: msg.content
    }));
    
    console.log('[express] Mapped conversation history with roles');

    try {
      // Generate AI response
      console.log('[express] Generating bot response with message:', parsed.data.content);
      const botResponse = await generateChatResponse(
        parsed.data.content,
        conversationHistory
      );

      if (botResponse) {
        console.log('[express] Bot response generated successfully');
        // Create bot message
        const botMessage = await storage.createChatMessage({
          content: botResponse,
          entryId,
          isBot: true,
          userId: req.user.id,
        });
        
        console.log('[express] Bot message created:', botMessage);
        res.json([userMessage, botMessage]);
      } else {
        console.warn('[express] Empty bot response received');
        res.json([userMessage]);
      }
    } catch (error) {
      console.error("[express] Error generating chat response:", error);
      res.json([userMessage]);
    }
  });

  // Analysis endpoints
  app.get("/api/analysis/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const count = await storage.getUnanalyzedEntriesCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unanalyzed entries count:", error);
      res.status(500).json({ message: "Failed to get unanalyzed entries count" });
    }
  });

  app.post("/api/analysis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get unanalyzed entries
      const entries = await storage.getUnanalyzedEntries(req.user.id);
      
      if (entries.length === 0) {
        return res.status(400).json({ message: "No entries to analyze" });
      }
      
      // Prepare entries with their chat messages for analysis
      const entriesWithChats = await Promise.all(
        entries.map(async (entry) => {
          const chatMessages = await storage.getChatMessages(entry.id);
          return {
            question: entry.question,
            answer: entry.answer,
            chatMessages
          };
        })
      );
      
      // Generate analysis using OpenAI
      const analysisContent = await generateAnalysis(entriesWithChats);
      
      // Create analysis record
      const analysis = await storage.createAnalysis(req.user.id, {
        content: analysisContent,
        entryCount: entries.length
      });
      
      // Mark entries as analyzed
      await storage.markEntriesAsAnalyzed(
        req.user.id, 
        entries.map(entry => entry.id)
      );
      
      // Update user's last analysis time
      await storage.updateUserLastAnalysisTime(req.user.id);
      
      res.status(201).json(analysis);
    } catch (error) {
      console.error("Error generating analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  app.get("/api/analysis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const analyses = await storage.getAnalyses(req.user.id);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      console.log(`Fetching analysis with ID: ${req.params.id} for user: ${req.user.id}`);
      
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        console.error(`Invalid analysis ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid analysis ID" });
      }
      
      const analysis = await storage.getAnalysis(req.user.id, analysisId);
      
      if (!analysis) {
        console.log(`Analysis not found with ID: ${analysisId} for user: ${req.user.id}`);
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      console.log(`Analysis found: ${JSON.stringify(analysis)}`);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}