import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import axios from "axios";
import * as zlib from "zlib";
import { z } from "zod";

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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // HiAnime API routes
  anime: router({
    search: publicProcedure
      .input(z.object({ keyword: z.string().default(""), page: z.number().default(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(`${HIANIME_BASE}/search`, {
            params: { keyword: input.keyword, page: input.page },
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

          return { success: true, html };
        } catch (error: any) {
          console.error("Search error:", error.message);
          return { success: false, error: error.message, html: "" };
        }
      }),

    episodes: publicProcedure
      .input(z.object({ animeId: z.string() }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(`${HIANIME_BASE}/ajax/v2/episode/list/${input.animeId}`, {
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
          return { success: true, html: data.html || "" };
        } catch (error: any) {
          console.error("Episodes error:", error.message);
          return { success: false, error: error.message, html: "" };
        }
      }),

    imageProxy: publicProcedure
      .input(z.object({ url: z.string() }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(input.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            responseType: "arraybuffer",
          });

          // Convert to base64
          const base64 = response.data.toString("base64");
          const contentType = response.headers["content-type"] || "image/jpeg";

          return {
            success: true,
            data: `data:${contentType};base64,${base64}`,
          };
        } catch (error: any) {
          console.error("Image proxy error:", error.message);
          return { success: false, error: error.message, data: "" };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
