import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEntrySchema } from "@shared/schema";

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

  app.get("/api/question", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const question = storage.getDailyQuestion(new Date());
    res.json({ question });
  });

  const httpServer = createServer(app);
  return httpServer;
}
