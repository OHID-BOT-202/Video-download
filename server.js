const express = require("express");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { alldown } = require("shaon-videos-downloader");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const CACHE = path.join(__dirname, "cache");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC));
fs.ensureDirSync(CACHE);

app.post("/api/download", async (req, res) => {
  try {
    const content = String(req.body?.url || "").trim();

    if (!/^https?:\/\//i.test(content)) {
      return res.status(400).json({
        ok: false,
        error: "Please provide a valid http/https URL."
      });
    }

    // Original autodl.js logic:
    // const data = await alldown(content);
    const data = await alldown(content);

    if (!data || !data.url) {
      return res.status(422).json({
        ok: false,
        error: "Downloader did not return a video URL."
      });
    }

    const response = await axios.get(data.url, {
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000
    });

    const filename = `auto-${Date.now()}.mp4`;
    const filePath = path.join(CACHE, filename);

    // Equivalent to the original file-writing step.
    await fs.writeFile(filePath, Buffer.from(response.data));

    res.json({
      ok: true,
      url: `/media/${encodeURIComponent(filename)}`,
      filename
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: error?.message || "Download failed."
    });
  }
});

app.get("/media/:file", async (req, res) => {
  const file = path.basename(req.params.file);
  const filePath = path.join(CACHE, file);

  if (!(await fs.pathExists(filePath))) {
    return res.status(404).send("File not found");
  }

  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Auto Downloader running at http://localhost:${PORT}`);
});
