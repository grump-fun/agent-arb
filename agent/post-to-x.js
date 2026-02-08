/**
 * Post a tweet to X via the same Zapier webhook used by x-autopilot.
 * The AI agent can run this when it decides to post (e.g. from Cursor CLI).
 *
 * Usage:
 *   node post-to-x.js "Your tweet text here"
 *   node post-to-x.js --file path/to/file.txt
 *
 * Loads repo root .env so ZAPIER_POST_NOW_NO_MEDIA_URL / ZAPIER_POST_NOW_URL are used.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
config({ path: join(ROOT, ".env") });

const MAX_TWEET_LENGTH = 280;

/**
 * Format tweet text for X: strip markdown, preserve paragraph breaks, truncate to 280.
 * - Removes **, *, #, `, [text](url) -> url, bullet points
 * - Preserves single newlines as paragraph breaks; collapses multiple newlines to one
 * - Collapses multiple spaces within a line to single space
 * - Trims; truncates with … if over limit
 */
function formatTweetText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2")
    .replace(/^[\s*\-•]\s*/gm, "");
  // Preserve paragraph breaks: normalize \n\n+ to \n\n, then collapse spaces within each line
  s = s
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  s = s.trim();
  if (s.length > MAX_TWEET_LENGTH) {
    s = s.slice(0, MAX_TWEET_LENGTH - 1).trim() + "…";
  }
  return s;
}

function getPayload(text, media, link) {
  return {
    data: {
      text: text || "",
      media: media || undefined,
      link: link || undefined,
      scheduleAt: undefined,
    },
  };
}

async function main() {
  let text = "";
  let media;
  let link;

  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node post-to-x.js \"tweet text\" | node post-to-x.js --file path/to/file.txt");
    process.exit(1);
  }

  if (arg === "--file") {
    const filePath = process.argv[3];
    if (!filePath) {
      console.error("--file requires a path");
      process.exit(1);
    }
    const fullPath = join(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      console.error("File not found:", fullPath);
      process.exit(1);
    }
    text = readFileSync(fullPath, "utf8").trim();
  } else {
    text = arg;
  }

  if (!text) {
    console.error("Empty text.");
    process.exit(1);
  }

  const formatted = formatTweetText(text);
  if (!formatted) {
    console.error("Tweet is empty after formatting.");
    process.exit(1);
  }

  const url = process.env.X_POST_WEBHOOK_URL || process.env.ZAPIER_POST_NOW_NO_MEDIA_URL;
  if (!url) {
    console.error("Set X_POST_WEBHOOK_URL or ZAPIER_POST_NOW_NO_MEDIA_URL (from x-autopilot .env)");
    process.exit(1);
  }

  const payload = getPayload(formatted, media, link);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Post failed:", res.status, await res.text());
    process.exit(1);
  }
  console.log("Posted to X (Zapier). Length:", formatted.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
