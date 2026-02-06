# Optional: custom Anchor build (toolchain only). Prefer the official image:
#   docker compose run --rm anchor-build   (uses solanafoundation/anchor:v0.31.1)
# Use this Dockerfile only if you need a different Anchor/Solana version.
FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG SOLANA_VERSION=1.18.22
ARG ANCHOR_VERSION=0.30.0

ENV HOME=/root
ENV PATH="${HOME}/.local/share/solana/install/active_release/bin:${PATH}"

RUN apt-get update -qq && apt-get install -qq --no-install-recommends \
    build-essential curl git pkg-config libssl-dev libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Rust (required for Anchor)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="${HOME}/.cargo/bin:${PATH}"
RUN rustup component add rustfmt

# Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v${SOLANA_VERSION}/install)"
RUN solana --version

# Anchor CLI (match programs/agent_arena anchor-lang 0.30.1)
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v${ANCHOR_VERSION} anchor-cli --locked

WORKDIR /workspace

# Default: build the program (override with docker run ... anchor test etc.)
CMD ["anchor", "build"]
