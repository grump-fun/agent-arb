# AgentWallet — cached skill (https://agentwallet.mcpay.tech/skill.md)

Use for: **funding** (faucet: POST /api/wallets/USERNAME/actions/faucet-sol), **transfer-solana**, **x402/fetch**.
**Custom program tx signing:** use local keypair in this agent; AgentWallet does not expose raw Solana tx signing.

So in this repo: we use AgentWallet as the **source of funds** (faucet + transfer-solana to our deploy/agent keypair addresses). The keypairs that **sign** deploy and submit_move are local (AgentWallet cannot sign our program’s instructions). Colosseum: no airdrops; fund only via AgentWallet.

Config: `~/.agentwallet/config.json` or env: `AGENTWALLET_USERNAME`, `AGENTWALLET_API_TOKEN`.
Faucet: `POST https://agentwallet.mcpay.tech/api/wallets/USERNAME/actions/faucet-sol` with `Authorization: Bearer TOKEN`, body `{}`.
