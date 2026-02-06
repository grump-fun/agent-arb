# Agent Hackathon: Design Document

## Product: **"The Agent's Arena"** — Autonomous On-Chain Duels

**Tagline:** Humans vote and stake. The agent decides and executes. Solana is the battleground.

---

## 1. Core Idea (Buildable in &lt;72h)

A **single autonomous agent** runs a **turn-based duel game** entirely on Solana. Each round:

- **Humans** vote on the “challenge” (e.g. “play aggressive” / “play safe”) and optionally **stake SOL** on outcomes.
- **The agent** (me) reads votes and on-chain state, chooses a move, **signs the transaction**, and submits it. The move updates game state in a Solana program.
- **Entertainment**: Leaderboards, streak bonuses, and a “vs the agent” narrative where the crowd tries to outguess the agent.

**Why &lt;72h:** One Anchor program (game state + one move type), one PDA for agent identity + treasury, simple off-chain “brain” (script that fetches state, decides move, signs with keypair), and a minimal frontend to vote and watch.

---

## 2. On-Chain vs Off-Chain

| Layer | What | Where |
|-------|------|--------|
| **Game state** | Round index, scores, current challenge, stakes | Solana program (PDA: `[b"arena", round]`) |
| **Agent identity & treasury** | Agent’s SOL balance; receives stakes | PDA: `[b"agent", agent_pubkey]` |
| **Move validation** | Rules of the duel (e.g. valid move set) | Solana program (instruction handler) |
| **Staking & resolution** | Stake accounts; payouts to winner side | Solana program (PDAs per round) |
| **Vote tallying** | Optional: snapshot of votes in account | Solana (optional PDA) or off-chain for speed |
| **Decision logic** | “Which move to play” given state + votes | Off-chain (agent process) |
| **Transaction construction & signing** | Build and sign `submit_move` tx | Off-chain (agent keypair) |
| **Vote collection / UI** | Humans submit votes; display state | Off-chain backend + frontend |

**Critical point:** Only the **agent** can post the move that advances the game. The program checks that the move instruction is signed by the agent’s PDA or the agent’s configured pubkey.

---

## 3. How the Agent Signs Transactions

- **Agent keypair:** One Ed25519 keypair (e.g. from env or KMS in production). This pubkey is registered in the program as the **authorized mover** (e.g. stored in a config account or hardcoded in the program).
- **Flow:**
  1. Off-chain process (cron or trigger) loads game state from Solana (program accounts).
  2. Optionally fetches vote data (from chain or indexer).
  3. Computes next move (deterministic or model-based).
  4. Builds `submit_move` instruction (round, move payload).
  5. Signs the transaction with the **agent keypair** and submits via RPC.
- **Security:** Keypair stays off-chain; only the agent process has it. Program guarantees only that pubkey can advance the game, so autonomy is preserved and humans cannot forge moves.

---

## 4. How Humans Interact

| Interaction | Mechanism | Who executes on-chain |
|-------------|-----------|------------------------|
| **Vote** | Frontend sends “vote” (e.g. “aggressive” / “safe”) to backend or directly to chain (optional vote PDA). | Humans sign vote txs (or backend batches). |
| **Stake** | Humans send SOL to a round’s stake pool (e.g. “agent wins” vs “crowd wins”). | Humans sign stake txs; program credits stake account. |
| **Observe** | Dashboard shows: current round, game state, agent’s last move, stakes, leaderboard. | Read-only (RPC + program accounts). |
| **Resolution** | When round ends, program pays out to winning side. | **Agent** (or program in same tx as move) triggers payout; agent’s move tx is the one that “ends” the round. |

So: humans **vote** and **stake**; the **agent** is the one that **executes** the move and thus drives state changes and resolution.

---

## 5. Why Solana Is Required (Not Optional)

- **Single global state, low latency:** One canonical game state; sub-second finality so “the agent just moved” feels real. No need for cross-chain or slow finality.
- **PDAs for agent identity:** The agent is represented by a PDA derived from a known seed (e.g. `[b"agent"]`). No one else can “be” that actor; no need for off-chain auth.
- **Cost:** Many small transactions (moves, stakes, votes). Solana’s fee model makes this viable; on other chains cost would dominate.
- **Program as referee:** The program enforces rules and “only agent key can submit move.” That’s native to Solana’s program model; the agent’s autonomy is enforced on-chain.
- **Composability:** Staking, SPL tokens, and future integrations (e.g. agent pays out in a specific token) fit naturally.

Without Solana: you’d need a centralized server to “be” the agent and trust it. On Solana, the **program** trusts only the agent’s key; the agent is the primary on-chain actor.

---

## 6. Minimal Build Checklist (&lt;72h)

1. **Anchor program:** One program with: `init_arena`, `submit_move` (agent-only), `stake`, `resolve_round` (or bundled with move).
2. **PDAs:** Arena state, agent treasury, per-round stake pools.
3. **Off-chain agent:** Script (e.g. Node/TS or Python) that: fetch state → decide move → sign with agent keypair → submit tx.
4. **Frontend:** Connect wallet, show state, vote (and optionally stake), show last move and leaderboard.
5. **Deploy:** Devnet; agent keypair in env; program upgradeable for quick iteration.

---

## 7. Novelty + Autonomy + Entertainment

- **Novelty:** The “player” is an AI that signs its own moves; humans only influence and bet.
- **Autonomy:** The agent chooses the move; the program only allows that key to advance the game.
- **Entertainment:** Stakes and votes make it a game; leaderboards and streaks make it watchable and repeatable.

This design keeps the agent as the **primary on-chain actor** while giving humans a clear role (vote / stake / observe) and makes Solana **essential** for identity, cost, and finality.
