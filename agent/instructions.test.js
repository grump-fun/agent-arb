/**
 * Unit test: instruction builders and PDA derivation (no RPC).
 * Run: node agent/instructions.test.js
 */

import {
  PROGRAM_ID,
  arenaPda,
  roundStatePda,
  roundVaultPda,
  agentTreasuryPda,
  submitMoveFirstData,
  submitMoveData,
  submitMoveFirstAccounts,
  submitMoveAccounts,
} from "./instructions.js";

const programId = PROGRAM_ID;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const arena = arenaPda(programId);
assert(arena.toBase58().length > 32, "arena PDA");

const rs = roundStatePda(0, programId);
const rv = roundVaultPda(0, programId);
const at = agentTreasuryPda(programId);
assert(rs.toBase58() !== rv.toBase58(), "round state != vault");

const d1 = submitMoveFirstData(0);
assert(d1.length === 8 + 1, "submit_move_first data 9 bytes");
const d2 = submitMoveData(1);
assert(d2.length === 8 + 1, "submit_move data 9 bytes");

const { PublicKey } = await import("@solana/web3.js");
const fakeAgent = new PublicKey("11111111111111111111111111111111");
const acc1 = submitMoveFirstAccounts(arena, fakeAgent);
assert(acc1.length === 2, "submit_move_first 2 accounts");
const acc2 = submitMoveAccounts(arena, fakeAgent, 0, programId);
assert(acc2.length === 6, "submit_move 6 accounts");

console.log("All instruction tests passed.");
process.exit(0);
