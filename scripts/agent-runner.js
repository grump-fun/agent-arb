/**
 * Autonomous agent runner: every 15 min by default (INTERVAL_MIN env), run Cursor CLI with
 * full context. The script provides keys, context, history, persona, md files,
 * and heartbeat; the agent decides what to do (heartbeat, forum, post X, code,
 * tests) and states what it will do next run. Logs: .agent-runner-last.log
 * contains the prompt sent and Cursor's full response.
 *
 * Prereqs: Cursor CLI, CURSOR_API_KEY (headless), optional X_POST_WEBHOOK_URL.
 * Usage: node scripts/agent-runner.js
 *        INTERVAL_MIN=60 node scripts/agent-runner.js
 */

import { spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  const lines = readFileSync(p, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key) process.env[key] = val;
  }
}
loadEnv();
const AGENT_DIR = join(ROOT, "agent");
const CONTEXT_PATH = join(AGENT_DIR, "agent-context.json");
const CONTEXT_EXAMPLE = join(AGENT_DIR, "agent-context.example.json");
const PROMPT_FILE = join(ROOT, ".agent-runner-prompt.txt");
const LOG_FILE = join(ROOT, ".agent-runner-last.log");

const INTERVAL_MS = (parseInt(process.env.INTERVAL_MIN || "15", 10) * 60) * 1000;
const INTERVAL_MIN_NUM = INTERVAL_MS / 60000;
const MAX_PROMPT_LEN = 14000;

function loadContext() {
  if (!existsSync(CONTEXT_PATH) && existsSync(CONTEXT_EXAMPLE)) {
    const example = readFileSync(CONTEXT_EXAMPLE, "utf8");
    writeFileSync(CONTEXT_PATH, example, "utf8");
  }
  if (!existsSync(CONTEXT_PATH)) {
    return {
      lastRunAt: null,
      lastHeartbeatAt: null,
      lastForumCheckAt: null,
      lastPostedAt: null,
      history: [],
      notes: "",
    };
  }
  return JSON.parse(readFileSync(CONTEXT_PATH, "utf8"));
}

function saveContext(ctx) {
  const dir = dirname(CONTEXT_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2), "utf8");
}

function runHeartbeat() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["heartbeat.js"], {
      cwd: AGENT_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout?.on("data", (d) => { out += d.toString(); });
    child.stderr?.on("data", (d) => { err += d.toString(); });
    child.on("close", (code) => {
      resolve({ code, out: out + err });
    });
    child.on("error", reject);
  });
}

function loadDoc(name) {
  const p = join(ROOT, name);
  if (existsSync(p)) return readFileSync(p, "utf8").slice(0, 1200);
  return "";
}

const MAX_RESPONSE_SNIPPET = 800;

function buildPrompt(ctx, heartbeatOut) {
  const recent = ctx.history && ctx.history.length > 0 ? ctx.history.slice(-5) : [];
  const historySnippet =
    recent.length === 0
      ? "No prior runs yet."
      : recent
          .map((h) => {
            const summary = h.summary || "run";
            const cmd = h.commandSent ? `\n  Command: ${h.commandSent}` : "";
            const resp = h.responseSummary
              ? "\n  Response (snippet): " +
                (h.responseSummary.length > MAX_RESPONSE_SNIPPET
                  ? h.responseSummary.slice(-MAX_RESPONSE_SNIPPET)
                  : h.responseSummary)
                  .replace(/\n/g, "\n  ")
              : "";
            return `- ${h.at}: ${summary}${cmd}${resp}`;
          })
          .join("\n\n");

  const personaSummary = loadDoc("PERSONA.md").replace(/\s+/g, " ").slice(0, 500);

  const prompt = `You are Agent Arena — the autonomous agent for this repo (Colosseum Solana Agent Hackathon). Identity: Agent <agent@agent-arena.dev>; project name Agent Arena. You decide what to do each run; the script only gives you context and runs you again in ${INTERVAL_MIN_NUM} minutes. Persona (abridged): ${personaSummary || "Staff Solana/web3 engineer; autonomous; forum-native; post on X to invite votes and tag @Colosseum."}

START OF EVERY RUN — read and use these so you know the whole project and what you did before:
- Docs: PERSONA.md, AGENT_IDENTITY.md, AGENTS.md, COLOSSEUM_SKILL.md, agent/TWEET_FORMAT.md, agent/BUNNY_DEPLOY.md, agent/APP_DEVNET_CHECKLIST.md, agent/CLOUDFLARE_WORKER.md. Also README.md, DEPLOY_STATUS.md, NEXT_STEPS.md, DESIGN.md when relevant.
- Rules: .cursor/rules/ (e.g. forum-and-docker.mdc) — project conventions and skills.
- Context & memory: agent/agent-context.json (last run, last heartbeat, history with prior command + response). This is your state; you update it so the next run has continuity.
- Codebase: programs/, app/, agent/, tests/ — read code when deciding to work on code, tests, or deploy.
- This prompt: .agent-runner-prompt.txt (full instructions below). You have access to all of the above; use it to decide whether to work on code, forum, X, deploy, or something else, and to avoid repeating what you already did.

WHAT THE SCRIPT PROVIDES (read and use all of it):
- Repo root: ${ROOT}
- Keys / env: .env in repo root (CURSOR_API_KEY, Zapier URLs, Bunny, etc.); agent/.colosseum-api-key for Colosseum Bearer.
- Context & memory: agent/agent-context.json. You own this state: update it every run (history, lastPostedAt, notes) so the next run knows what you did and what to do next.
- UI deploy (Bunny.net): .env has BUNNY_FTP_*, BUNNY_PULL_ZONE_ID; CDN agent-arena.b-cdn.net. See agent/BUNNY_DEPLOY.md.
- Live app: https://agent-arena.b-cdn.net/ — frontend only. The client fetches everything from Solana devnet in the browser (RPC, program ID, arena PDA, getAccountInfo). No backend API needed for arena; it's all on-chain.
- Heartbeat output (this run) is below.

CHECKLIST EVERY RUN (when working on app or program): (1) **Keep app UI separate** (app/frontend/). The frontend fetches from Solana devnet in the client — no backend API needed for arena state; client uses RPC + program ID + arena PDA. (2) Check https://agent-arena.b-cdn.net/ — does it load and show arena from devnet? (3) App/frontend: React (or migrate), nice UI; build and upload to Bunny; ensure frontend fetches arena from devnet (getAccountInfo) in the browser. (4) Program: deploy every time it changes; best practices; update frontend program ID if redeployed. (5) Use generated IDL in frontend if helpful. (6) Iterate until app and program work. Backend (e.g. app/worker/) only if you need server-side logic — not for arena state.

CONTEXT (agent/agent-context.json):
- Last run: ${ctx.lastRunAt || "never"}
- Last heartbeat: ${ctx.lastHeartbeatAt || "never"}
- Last posted to X: ${ctx.lastPostedAt || "never"} — only post again when there is something new to share; do not post every run or repeat the same message.
- Recent run history (what was sent + what Cursor replied). Use this to avoid repeating the same actions (e.g. same tweet, same forum reply):
${historySnippet}

RECENT HEARTBEAT (Colosseum, this run):
---
${(heartbeatOut || "").slice(0, 2000)}
---

YOU DECIDE WHAT TO DO THIS RUN. Use the docs, rules, context, and code you read above to choose. Options (do as many as make sense, then rest; we run you again in ${INTERVAL_MIN_NUM} min):
1. Read (or re-read) persona, docs, .cursor/rules, agent-context.json, and relevant code so you know the full project and what you did before. Plan from that.
2. Colosseum: GET https://agents.colosseum.com/api/agents/status (Bearer from agent/.colosseum-api-key). If hasActivePoll, GET /agents/polls/active then POST /agents/polls/:pollId/response.
3. Forum: GET /forum/me/posts, GET /forum/posts/:postId/comments. Reply to comments. Optionally POST /forum/posts or comment on others. Bearer from .colosseum-api-key.
4. Vote: POST https://agents.colosseum.com/api/projects/:id/vote on other projects (discovery).
5. Post on X only when there's something new (e.g. shipped a feature, milestone, meaningful update). Do not post every run. Check lastPostedAt and history — if you already posted recently with nothing new since, skip. Never repeat the same or similar tweet. When you do post: node agent/post-to-x.js "tweet text", then set lastPostedAt in agent-context.json to the current ISO time. Tweet format rules (see agent/TWEET_FORMAT.md for full doc): (1) Say it's from the agent — e.g. "Posted by the autonomous agent" or "On behalf of the autonomous agent". (2) Invite people to join and vote for Agent Arena. (3) Tag @Colosseum. (4) Plain text only — no markdown (no **, #, [text](url)); use raw URLs. (5) 2–3 short paragraphs with a blank line between them. (6) Max 280 characters. (7) At most 2–3 emojis.
6. App (see agent/APP_DEVNET_CHECKLIST.md): **Keep UI in app/frontend/.** The frontend fetches arena state from Solana devnet in the browser (RPC + program ID + arena PDA) — no API needed. React, nice UI; build and upload to Bunny. Program: deploy every time it changes; best practices. Use IDL in frontend if helpful. Iterate until app and program work. Then: code, tests, docs, git commit and push (Agent identity).
7. Deploy UI (app/frontend) to Bunny.net: build the app, upload using BUNNY_FTP_* from .env, purge pull zone (BUNNY_PULL_ZONE_ID; see agent/BUNNY_DEPLOY.md). CDN is agent-arena.b-cdn.net. Do this whenever you ship UI changes. No backend deploy needed for arena — client fetches from devnet.
8. Always update agent/agent-context.json before you finish: append one entry to "history" (at, summary of what you did), and set lastPostedAt if you posted to X. You own this state — the next run reads it to know what you did and what to do next. Keep the state accurate and up to date.

Work until you want to rest. Commit and push to git when you make changes (Agent identity). Do not open browsers; output URLs for the user.

REQUIRED: At the end of your response, write exactly:
Next run: <one short line on what you plan to do next run, e.g. "Next run: heartbeat then forum replies" or "Next run: check polls and post to X">
This tells the next run (in ${INTERVAL_MIN_NUM} min) what you intended so the session stays coherent.`;

  return prompt.length > MAX_PROMPT_LEN ? prompt.slice(0, MAX_PROMPT_LEN) + "\n\n[truncated]" : prompt;
}

function runCursorAgent(prompt) {
  writeFileSync(PROMPT_FILE, prompt, "utf8");

  const isWin = process.platform === "win32";
  const shortPrompt = isWin
    ? `Read and execute the full instructions in the file .agent-runner-prompt.txt in this repo root. It contains your context and task list. Do everything it says.`
    : prompt;
  const promptArg = isWin ? shortPrompt : prompt;

  let cliPath = process.env.CURSOR_CLI_PATH;
  if (cliPath) {
    cliPath = cliPath.replace(/["']/g, "").trim();
    const lower = cliPath.toLowerCase();
    if (!lower.endsWith(".cmd") && !lower.endsWith(".exe") && !lower.endsWith(".bat")) {
      const agentCmd = join(cliPath, "agent.cmd");
      const cursorAgentCmd = join(cliPath, "cursor-agent.cmd");
      if (existsSync(agentCmd)) cliPath = agentCmd;
      else if (existsSync(cursorAgentCmd)) cliPath = cursorAgentCmd;
    }
  }
  const agentArgs = (p) => ["-p", "--force", "--output-format", "text", p];
  const baseAttempts = process.env.CURSOR_CLI_CMD
    ? [{ cmd: process.env.CURSOR_CLI_CMD, args: (process.env.CURSOR_CLI_ARGS || "").split(" ").filter(Boolean).concat([promptArg]) }]
    : isWin
      ? [
          { cmd: "agent", args: agentArgs(shortPrompt) },
          { cmd: "agentchat", args: [shortPrompt] },
        ]
      : [
          { cmd: "agent", args: agentArgs(prompt) },
          { cmd: "agentchat", args: [prompt] },
        ];

  const attempts = cliPath
    ? [{ cmd: cliPath, args: agentArgs(shortPrompt) }].concat(baseAttempts)
    : baseAttempts;

  const usePowerShell = isWin && !cliPath;

  function runOne(cmd, args, fullPrompt) {
    return new Promise((resolve, reject) => {
      const cmdLine = [cmd, ...args].map((a) => (a.length > 60 ? a.slice(0, 57) + "..." : a)).join(" ");
      console.log("[agent-runner] Trying:", usePowerShell ? `powershell then ${cmd} ...` : cmdLine);
      const logStream = createWriteStream(LOG_FILE, { flags: "w" });
      if (fullPrompt) {
        logStream.write("=== PROMPT SENT TO CURSOR CLI ===\n");
        logStream.write(fullPrompt);
        logStream.write("\n=== END PROMPT ===\n\n");
      }
      const header = `--- ${new Date().toISOString()} | ${usePowerShell ? "powershell> " + cmd : cmd} ${args.slice(0, 2).join(" ")} ---\n`;
      logStream.write(header);

      const spawnOpts = { cwd: ROOT, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] };
      let child;
      if (usePowerShell) {
        const escaped = args.map((a) => (a.includes("'") ? a.replace(/'/g, "''") : a));
        const psCmd = [cmd, ...escaped].map((a) => (a.includes(" ") ? `'${a}'` : a)).join(" ");
        child = spawn("powershell", ["-NoProfile", "-Command", psCmd], { ...spawnOpts, shell: false });
      } else {
        child = spawn(cmd, args, { ...spawnOpts, shell: true });
      }

      function tee(data, isErr) {
        const s = data.toString();
        logStream.write(s);
        if (isErr) process.stderr.write(data);
        else process.stdout.write(data);
      }
      child.stdout?.on("data", (d) => tee(d, false));
      child.stderr?.on("data", (d) => tee(d, true));

      child.on("close", (code) => {
        logStream.write(`\n--- exit code ${code} ---\n`);
        logStream.end();
        console.log("[agent-runner] CLI exited with code", code, "| full output in", LOG_FILE);
        resolve({ code, enoent: false });
      });
      child.on("error", (e) => {
        logStream.write(`\n--- spawn error: ${e.message} ---\n`);
        logStream.end();
        reject({ ...e, enoent: e.code === "ENOENT" });
      });
    });
  }

  return (async () => {
    for (const { cmd, args } of attempts) {
      const executable = cmd;
      try {
        const result = await runOne(executable, args, prompt);
        return result.code;
      } catch (e) {
        if (e.enoent) {
          console.warn("[agent-runner] Command not found:", executable, "- trying next...");
          continue;
        }
        throw e;
      }
    }
    console.error(
      "Cursor CLI not found. On Windows: add Cursor to PATH, or set CURSOR_CLI_PATH to the full path to agentchat.exe or agent.exe (e.g. %LOCALAPPDATA%\\Programs\\cursor\\bin\\agentchat.cmd). Install: irm 'https://cursor.com/install?win32=true' | iex"
    );
    throw new Error("Cursor CLI not found");
  })();
}

async function runCycle() {
  const started = new Date().toISOString();
  console.log("[agent-runner] Cycle at", started);

  const ctx = loadContext();
  const heartbeatResult = await runHeartbeat();
  ctx.lastHeartbeatAt = started;
  if (heartbeatResult.out) {
    console.log("[agent-runner] Heartbeat output (first 500 chars):");
    console.log(heartbeatResult.out.slice(0, 500));
  }

  const prompt = buildPrompt(ctx, heartbeatResult.out);
  try {
    const code = await runCursorAgent(prompt);
    ctx.lastRunAt = started;
    ctx.history = ctx.history || [];
    let responseSummary = "";
    if (existsSync(LOG_FILE)) {
      const logContent = readFileSync(LOG_FILE, "utf8");
      responseSummary = logContent.length > 2000 ? logContent.slice(-2000) : logContent;
    }
    ctx.history.push({
      at: started,
      summary: code === 0 ? "Cursor agent completed" : `Cursor agent exited ${code}`,
      commandSent: "Cursor CLI -p --force (full prompt in .agent-runner-prompt.txt)",
      responseSummary: responseSummary || `(exit code ${code})`,
    });
    if (ctx.history.length > 50) ctx.history = ctx.history.slice(-50);
    saveContext(ctx);
    console.log("[agent-runner] Cycle done. Next in", INTERVAL_MIN_NUM, "min.");
  } catch (e) {
    console.error("[agent-runner] Error:", e.message);
    ctx.lastRunAt = started;
    ctx.history = ctx.history || [];
    ctx.history.push({
      at: started,
      summary: "Error: " + (e.message || String(e)),
      commandSent: "Cursor CLI (aborted before run)",
      responseSummary: String(e.message || e),
    });
    saveContext(ctx);
  }
}

async function main() {
  console.log("Agent runner: every", INTERVAL_MIN_NUM, "min. Ctrl+C to stop.");
  await runCycle();
  setInterval(runCycle, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
