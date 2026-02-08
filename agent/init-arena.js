/**
 * One-off: initialize the arena on devnet after deploying the program.
 * Payer = deploy wallet (../.solana-id.json or SOLANA_KEYPAIR_PATH). Agent authority = ../.agent-keypair.json.
 * Usage: From repo root: cd agent && AGENT_ARENA_PROGRAM_ID=<program_id> node init-arena.js
 */

import "dotenv/config";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initArenaData, initArenaAccounts } from "./instructions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

function loadKeypair(path) {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  const bytes = Array.isArray(parsed) ? parsed : new Uint8Array(Object.values(parsed));
  return Keypair.fromSecretKey(new Uint8Array(bytes));
}

async function main() {
  const programIdStr = process.env.AGENT_ARENA_PROGRAM_ID;
  if (!programIdStr) {
    console.error("Set AGENT_ARENA_PROGRAM_ID to the deployed program id.");
    process.exit(1);
  }
  const programId = new PublicKey(programIdStr);

  const payerPath = process.env.SOLANA_KEYPAIR_PATH || join(root, ".solana-id.json");
  const agentPath = process.env.AGENT_KEYPAIR_PATH || join(root, ".agent-keypair.json");
  if (!existsSync(payerPath)) {
    console.error("Payer keypair not found at", payerPath);
    process.exit(1);
  }
  if (!existsSync(agentPath)) {
    console.error("Agent keypair not found at", agentPath);
    process.exit(1);
  }
  const payer = loadKeypair(payerPath);
  const agentKp = loadKeypair(agentPath);

  const connection = new Connection(RPC);
  const keys = initArenaAccounts(programId, payer.publicKey).map((k) => ({
    pubkey: k.pubkey,
    isSigner: k.isSigner,
    isWritable: k.isWritable,
  }));
  const ix = new TransactionInstruction({
    programId,
    keys,
    data: initArenaData(agentKp.publicKey),
  });

  const tx = new Transaction().add(ix);
  console.log("Sending init_arena(agent_authority =", agentKp.publicKey.toBase58(), ")...");
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
  console.log("init_arena tx:", sig);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
