import "dotenv/config";
import express from "express";
import cors from "cors";
import conditionsRouter from "./routes/conditions.js";
import weatherRouter from "./routes/weather.js";
import { startWeatherJob } from "./jobs/weatherJob.js";

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));

app.use("/api/conditions", conditionsRouter);
app.use("/api/weather", weatherRouter);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`main-site-api listening on port ${PORT}`);
});

startWeatherJob();
