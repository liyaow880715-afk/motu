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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[motu-auth-server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[motu-auth-server] Web Admin: http://0.0.0.0:${PORT}/`);
  console.log(`[motu-auth-server] Health check: http://0.0.0.0:${PORT}/health`);
});
