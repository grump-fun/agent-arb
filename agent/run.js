/**
 * Agent Arena — off-chain agent.
 * Fetches arena state, decides move, builds and signs submit_move (or submit_move_first) via AgentWallet.
 * Run on a schedule (cron) or trigger; requires AGENT_WALLET_* or keypair for signing.
 *
 * Colosseum: use AgentWallet for keys/signing (https://agentwallet.mcpay.tech/skill.md).
 */

import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRAM_ID = process.env.AGENT_ARENA_PROGRAM_ID || "11111111111111111111111111111111";
const ARENA_PDA_SEED = Buffer.from("arena");
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

function getArenaPda(programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [ARENA_PDA_SEED],
    new PublicKey(programId)
  );
  return pda;
}

async function fetchArenaState(connection, programId) {
  const arenaPda = getArenaPda(programId);
  const accountInfo = await connection.getAccountInfo(arenaPda);
  if (!accountInfo || !accountInfo.data) return null;
  const data = accountInfo.data;
  if (data.length < 8 + 32 + 8 + 8 + 8 + 1) return null;
  let offset = 8; // discriminator
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const round = data.readBigUInt64LE(offset);
  offset += 8;
  const agentWins = data.readBigUInt64LE(offset);
  offset += 8;
  const crowdWins = data.readBigUInt64LE(offset);
  return {
    authority: authority.toBase58(),
    round: Number(round),
    agentWins: Number(agentWins),
    crowdWins: Number(crowdWins),
  };
}

function decideMove(arena) {
  if (!arena) return null;
  // Simple strategy: alternate 0/1 by round for demo; replace with model or vote aggregation.
  const choice = arena.round % 2;
  return choice;
}

async function main() {
  const connection = new Connection(RPC);
  const programId = new PublicKey(PROGRAM_ID);
  const arena = await fetchArenaState(connection, programId);
  console.log("Arena state:", arena);

  if (!arena) {
    console.log("No arena initialized yet. Deploy program and run init_arena first.");
    return;
  }

  const moveChoice = decideMove(arena);
  console.log("Decided move_choice:", moveChoice);

  // Signing: use AgentWallet (Colosseum) or local keypair.
  // AgentWallet: POST to AgentWallet API to sign the serialized tx (see agentwallet.mcpay.tech/skill.md).
  // Local: load keypair from env/file and sign here.
  const keypairPath = process.env.AGENT_KEYPAIR_PATH || join(__dirname, "..", ".agent-keypair.json");
  if (!existsSync(keypairPath)) {
    console.log("No keypair at", keypairPath, "- cannot sign. Set AGENT_KEYPAIR_PATH or use AgentWallet.");
    console.log("To build the tx manually: instruction submit_move_first (round 0) or submit_move(round, move_choice).");
    return;
  }

  // Placeholder: actual tx build + sign requires @coral-xyz/anchor Program and IDL.
  console.log("Tx build/sign not implemented in this stub. Use Anchor Program.withMethod() + AgentWallet or local signer.");
  console.log("Instruction: arena.round === 0 ? submit_move_first : submit_move; args: move_choice =", moveChoice);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
