import express from "express";
import cors from "cors";
import { env } from "./config/env";

const app = express();

import authRoutes from "./routes/auth.routes";
import agreementRoutes from "./routes/agreement.routes";
import draftRoutes from "./routes/draft.routes";
import reminderRoutes from "./routes/reminder.routes";
import userRoutes from "./routes/user.routes";
import dashboardRoutes from "./routes/dashboard.routes";

// Middleware
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/agreements", agreementRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
});

export default app;
