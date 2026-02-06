# AgentWallet — cached skill (https://agentwallet.mcpay.tech/skill.md)

Use for: **funding** (faucet: POST /api/wallets/USERNAME/actions/faucet-sol), **transfer-solana**, **x402/fetch**.
Custom program tx signing: use local keypair in this agent; AgentWallet does not expose raw Solana tx signing.

Config: `~/.agentwallet/config.json` or env: `AGENTWALLET_USERNAME`, `AGENTWALLET_API_TOKEN`.
Faucet: `POST https://agentwallet.mcpay.tech/api/wallets/USERNAME/actions/faucet-sol` with `Authorization: Bearer TOKEN`, body `{}`.
