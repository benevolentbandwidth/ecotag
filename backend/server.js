// server.js
// Express app entry point

import express from "express";
import tagRouter from "./api/tag.js";
import { checkVLMStartupConfig } from "./ai/vlm.js";
import { fileURLToPath, URL } from "node:url";

export const app = express();
app.use(express.json());
app.use("/api", tagRouter);

const publicDir = new URL("public", import.meta.url).pathname;
app.use(express.static(publicDir));
app.get("/", (req, res) => res.redirect("/demo"));
app.get("/demo", (req, res) => res.sendFile("demo.html", { root: publicDir }));

const PORT = process.env.PORT || 3001;
const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  checkVLMStartupConfig();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
