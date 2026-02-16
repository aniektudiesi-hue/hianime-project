import express, { Request, Response } from "express";
import axios from "axios";
import * as zlib from "zlib";

const router = express.Router();

const HIANIME_BASE = "https://hianime.to";

// Helper to decompress gzip
const decompressGzip = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, decompressed) => {
      if (err) reject(err);
      else resolve(decompressed.toString("utf-8"));
    });
  });
};

// Search endpoint
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { keyword = "", page = 1 } = req.query;

    const response = await axios.get(`${HIANIME_BASE}/search`, {
      params: { keyword, page },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      responseType: "arraybuffer",
    });

    let html = response.data.toString("utf-8");

    // Decompress if gzipped
    if (response.headers["content-encoding"] === "gzip") {
      html = await decompressGzip(response.data);
    }

    res.json({ success: true, html });
  } catch (error: any) {
    console.error("Search error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Episodes endpoint
router.get("/episodes", async (req: Request, res: Response) => {
  try {
    const { animeId } = req.query;

    const response = await axios.get(`${HIANIME_BASE}/ajax/v2/episode/list/${animeId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      responseType: "arraybuffer",
    });

    let html = response.data.toString("utf-8");

    // Decompress if gzipped
    if (response.headers["content-encoding"] === "gzip") {
      html = await decompressGzip(response.data);
    }

    // Parse JSON response
    const data = JSON.parse(html);
    res.json({ success: true, html: data.html || "" });
  } catch (error: any) {
    console.error("Episodes error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Image proxy endpoint
router.get("/image-proxy", async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, error: "URL required" });
    }

    const response = await axios.get(url as string, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      responseType: "arraybuffer",
    });

    res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(response.data);
  } catch (error: any) {
    console.error("Image proxy error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get("/health", (req: Request, res: Response) => {
  res.json({ success: true, message: "API is running" });
});

export default router;
