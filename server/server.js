import { env } from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import apiRouter from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// Connect to MongoDB before accepting traffic
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api", limiter);

// --- Body parsing ---
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// --- Sanitization against NoSQL injection & XSS ---
app.use(mongoSanitize());
app.use(xssClean());

// --- Logging ---
if (!env.isProd) {
  app.use(morgan("dev"));
}

// --- Routes ---
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("MERN E-commerce API is running.");
});

// --- 404 + centralized error handler (must be last) ---
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[SERVER] Running in ${env.nodeEnv} mode on port ${env.port}`);
});

export default app;