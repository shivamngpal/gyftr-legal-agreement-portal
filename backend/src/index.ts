import express from "express";
import cors from "cors";
import { env } from "./config/env";

const app = express();

// Middleware
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
});

export default app;
