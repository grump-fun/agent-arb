/**
 * Agent Arena instruction builders (Anchor-compatible).
 * Discriminator = first 8 bytes of sha256("global:instruction_name"); then Borsh args.
 */

import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(process.env.AGENT_ARENA_PROGRAM_ID || "11111111111111111111111111111111");

function discriminator(name) {
  return createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
}

function u8Buffer(v) {
  const b = Buffer.alloc(1);
  b.writeUInt8(v, 0);
  return b;
}

function u64Buffer(v) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(v), 0);
  return b;
}

/**
 * PDA seeds for agent_arena program.
 */
export function arenaPda(programId = PROGRAM_ID) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("arena")], programId);
  return pda;
}

export function roundStatePda(round, programId = PROGRAM_ID) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("round"), u64Buffer(round)],
    programId
  );
  return pda;
}

export function roundVaultPda(round, programId = PROGRAM_ID) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("round_vault"), u64Buffer(round)],
    programId
  );
  return pda;
}

export function agentTreasuryPda(programId = PROGRAM_ID) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("agent_treasury")], programId);
  return pda;
}

/**
 * Build instruction data: submit_move_first(_move_choice: u8)
 */
export function submitMoveFirstData(moveChoice = 0) {
  return Buffer.concat([discriminator("submit_move_first"), u8Buffer(moveChoice)]);
}

/**
 * Build instruction data: submit_move(move_choice: u8)
 */
export function submitMoveData(moveChoice) {
  return Buffer.concat([discriminator("submit_move"), u8Buffer(moveChoice)]);
}

/**
 * Accounts for submit_move_first: arena (mut), agent_signer (signer).
 */
export function submitMoveFirstAccounts(arenaPdaKey, agentPubkey) {
  return [
    { pubkey: arenaPdaKey, isSigner: false, isWritable: true },
    { pubkey: agentPubkey, isSigner: true, isWritable: false },
  ];
}

/**
 * Accounts for submit_move: arena, agent_signer, round_state (prev), round_vault (prev), agent_treasury, system_program.
 */
export function submitMoveAccounts(arenaPdaKey, agentPubkey, prevRound, programId = PROGRAM_ID) {
  const systemProgramId = new PublicKey("11111111111111111111111111111111");
  return [
    { pubkey: arenaPdaKey, isSigner: false, isWritable: true },
    { pubkey: agentPubkey, isSigner: true, isWritable: false },
    { pubkey: roundStatePda(prevRound, programId), isSigner: false, isWritable: true },
    { pubkey: roundVaultPda(prevRound, programId), isSigner: false, isWritable: true },
    { pubkey: agentTreasuryPda(programId), isSigner: false, isWritable: true },
    { pubkey: systemProgramId, isSigner: false, isWritable: false },
  ];
}

export { PROGRAM_ID };
