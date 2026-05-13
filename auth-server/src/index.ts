import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.use(cors());
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api", adminRoutes);

// Static web admin UI
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// 404 handler for API routes
app.use("/api/*", (_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "API endpoint not found" } });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[motu-auth-server] Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: process.env.NODE_ENV === "production" ? "服务器内部错误" : err.message },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[motu-auth-server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[motu-auth-server] Web Admin: http://0.0.0.0:${PORT}/`);
  console.log(`[motu-auth-server] Health check: http://0.0.0.0:${PORT}/health`);
});
