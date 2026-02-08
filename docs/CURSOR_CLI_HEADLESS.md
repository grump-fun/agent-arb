# Running Cursor CLI from the agent-runner script

This summarizes the **official** [Cursor Headless CLI docs](https://cursor.com/docs/cli/headless) and how we invoke the CLI inside `scripts/agent-runner.js`.

## Official headless usage

- **Print mode (non-interactive):** Use `-p` or `--print` so the agent runs without an interactive session and prints the response.
- **File modifications:** Use `--print` together with `--force` so the agent can **apply** file changes in scripts. Without `--force`, changes are only proposed.
- **Output format:** With `--print` you can set `--output-format text` (default), `json`, or `stream-json`. We use the default `text` for a clean final answer.
- **Authentication:** For scripts/automation, set `CURSOR_API_KEY` in the environment (or in repo root `.env`; the runner loads it).

Example from the docs:

```bash
# Enable file modifications in print mode
agent -p --force "Refactor this code to use modern ES6+ syntax"

# Without --force, changes are only proposed
agent -p "Add JSDoc comments to this file"
```

## How the runner invokes the CLI

1. **Prompt:** The runner writes the full instructions to `.agent-runner-prompt.txt`. On Windows it passes a **short** prompt to avoid command-line length limits: *"Read and execute the full instructions in the file .agent-runner-prompt.txt in this repo root..."* The agent then reads that file via tool use. On macOS/Linux the full prompt can be passed as the argument.
2. **Flags:** We run: `agent -p --force "<prompt>"` (and optionally `--output-format text`). This matches the documented headless + file-write usage.
3. **Environment:** The runner loads the repo root `.env` into `process.env` before spawning, so `CURSOR_API_KEY` and any other vars are available to the CLI.
4. **Windows:** If `CURSOR_CLI_PATH` is **not** set, the runner runs the CLI via **PowerShell** (`powershell -NoProfile -Command "agent -p --force '...'"`) so it uses the same PATH as when you run `agent` in a terminal. If `CURSOR_CLI_PATH` is set, the runner calls that path directly (e.g. `agent.cmd`) with `shell: true`.

## References

- [Using Headless CLI](https://cursor.com/docs/cli/headless)
- [Using Agent in CLI (non-interactive)](https://cursor.com/docs/cli/using#non-interactive-mode)
- [CLI Authentication](https://cursor.com/docs/cli/reference/authentication) — use `CURSOR_API_KEY` for scripts
- [Output format](https://cursor.com/docs/cli/reference/output-format) — `text`, `json`, `stream-json`
