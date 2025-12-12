import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/database";
import { ensureAdmin } from "./utils/bootstrapAdmin";

dotenv.config();

const app = express();
export { app };

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Default to * for dev if not set
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);

app.get("/", (req, res) => {
  res.send("Pragalbh Services Backend is running");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdmin();
    app.listen(PORT, () => {
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
