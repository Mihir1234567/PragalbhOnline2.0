import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/database";
import { ensureAdmin } from "./utils/bootstrapAdmin";

dotenv.config();

const app = express();
const server = http.createServer(app);

export { app, server };

// CORS configuration (supports prod + preview + localhost)
const allowedOrigins = [
  "https://www.pragalbh.co.in",        // production frontend
  /\.vercel\.app$/,                   // all Vercel preview deployments
  "http://localhost:3000",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost")
      ) {
        return callback(null, true);
      }
      const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
      if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import authRoutes from "./routes/auth.routes";
import serviceRoutes from "./routes/service.routes";
import applicationRoutes from "./routes/application.routes";
import testimonialRoutes from "./routes/testimonial.routes";
import reviewRoutes from "./routes/reviewRoutes";
import statsRoutes from "./routes/stats.routes";
import whatsappRoutes from "./routes/whatsappRoutes";

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.get("/", (req, res) => {
  res.send("Pragalbh Services Backend is running");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdmin();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
