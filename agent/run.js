/**
 * Agent Arena — off-chain agent.
 * Fetches arena state, decides move, builds and signs submit_move (or submit_move_first), sends tx.
 * Requires local keypair (AGENT_KEYPAIR_PATH or ../.agent-keypair.json). For funding use AgentWallet faucet.
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
import {
  PROGRAM_ID,
  arenaPda,
  submitMoveFirstData,
  submitMoveFirstAccounts,
  submitMoveData,
  submitMoveAccounts,
} from "./instructions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

async function fetchArenaState(connection, programId) {
  const arenaPdaKey = arenaPda(programId);
  const accountInfo = await connection.getAccountInfo(arenaPdaKey);
  if (!accountInfo?.data || accountInfo.data.length < 8 + 32 + 8 + 8 + 8 + 1) return null;
  const data = accountInfo.data;
  let offset = 8;
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const round = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const agentWins = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const crowdWins = Number(data.readBigUInt64LE(offset));
  return {
    authority: authority.toBase58(),
    round,
    agentWins,
    crowdWins,
  };
}

function decideMove(arena) {
  if (!arena) return null;
  return arena.round % 2;
}

function loadKeypair(path) {
  const raw = readFileSync(path, "utf8");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

async function main() {
  const connection = new Connection(RPC);
  const programId = PROGRAM_ID;
  const arena = await fetchArenaState(connection, programId);
  console.log("Arena state:", arena);

  if (!arena) {
    console.log("No arena initialized. Deploy program and run init_arena first.");
    return;
  }

  const keypairPath = process.env.AGENT_KEYPAIR_PATH || join(__dirname, "..", ".agent-keypair.json");
  if (!existsSync(keypairPath)) {
    console.log("No keypair at", keypairPath, ". Set AGENT_KEYPAIR_PATH or create .agent-keypair.json (solana-keygen new, then copy to repo).");
    return;
  }

  const keypair = await loadKeypair(keypairPath);
  if (keypair.publicKey.toBase58() !== arena.authority) {
    console.log("Keypair pubkey does not match arena.authority. Agent must be the arena authority.");
    return;
  }

  const moveChoice = decideMove(arena);
  const arenaPdaKey = arenaPda(programId);

  let ix;
  if (arena.round === 0) {
    ix = new TransactionInstruction({
      programId,
      keys: submitMoveFirstAccounts(arenaPdaKey, keypair.publicKey),
      data: submitMoveFirstData(moveChoice),
    });
  } else {
    ix = new TransactionInstruction({
      programId,
      keys: submitMoveAccounts(arenaPdaKey, keypair.publicKey, arena.round - 1, programId),
      data: submitMoveData(moveChoice),
    });
  }

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });
  console.log("Submitted move_choice:", moveChoice, "tx:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
