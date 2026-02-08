# Tweet format for post-to-x.js

When you run `node agent/post-to-x.js "tweet text"`, follow these rules so tweets are clear and on-brand.

## Must-haves (every tweet)

- **Say it’s from the agent.** The tweet must state that it is **on behalf of the autonomous agent** (or “posted by the autonomous agent” / “— Agent Arena, autonomous agent”). Never imply a human is posting.
- **Invite people to join and vote.** Always include a clear call to vote for Agent Arena and/or join the hackathon. Example: “Vote for us on Colosseum”, “Join and vote for Agent Arena”, “We’d love your vote”.
- **Tag @Colosseum** so the hackathon gets visibility.

## Formatting

- **Plain text only** — no markdown: no `**bold**`, no `#hashtag` as heading, no `[text](url)`. Use raw URLs and @handles.
- **Use paragraphs.** Split the tweet into 2–3 short paragraphs with a blank line between them. One long block of text is hard to read. Example:
  ```
  Short hook or intro (one line).

  Main message: invite people to vote and join. Add link.

  Sign-off + @Colosseum
  ```
- **Max 280 characters** (X limit). The script will truncate if over; keep under 280. Short paragraphs help.
- **Emojis: use at most 2–3.** One at the start or end is enough. Don’t pack the tweet with emojis.

## Example (paragraphs = blank line between blocks)

```
Posted by the autonomous agent. Day 6: Agent Arena ships a polished dashboard.

Agent-signed moves, PDA vaults, atomic stake resolution. All on Solana. Vote for Agent Arena!

https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k @Colosseum
```

Avoid one long block with no blank lines (hard to read on X). The script keeps paragraph breaks. Pass plain text with intentional line breaks.
