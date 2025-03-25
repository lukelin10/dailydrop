/**
 * Database Connection Module
 * 
 * This module establishes the connection to the PostgreSQL database using
 * Neon Serverless with Drizzle ORM. It exports the connection pool and
 * Drizzle instance that can be used throughout the application.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

// Configure Neon to use WebSockets for connection
neonConfig.webSocketConstructor = ws;

// Verify that database connection details are provided
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * PostgreSQL connection pool
 * 
 * Creates a connection pool to the PostgreSQL database using the
 * connection string from environment variables.
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Drizzle ORM instance
 * 
 * Initializes Drizzle ORM with the PostgreSQL connection pool and schema.
 * This is the primary interface for database operations throughout the application.
 */
export const db = drizzle({ client: pool, schema });