# Whiteboard Gym

Practice the design whiteboard interview the way it really happens: spin for a prompt, work it on a board while an AI panel (a design manager and a design engineer) asks questions, present in 30 minutes, and get a one-page scorecard.

Free and open source. Live at **[whiteboardgym.com](https://whiteboardgym.com)** (launching Oct 29, 2026).

Made by [Zehra Akcali](https://zehranurakcali.com).

## Built on Mochiboard

The canvas is a fork of **[Mochiboard](https://github.com/jessawolfe-ux/mochiboard)** by [Jessa Wolfe](https://jessa.art), MIT licensed. All the board work (cards, frames, wireframe kit, connectors, pen, the Mochi helper) is hers; Whiteboard Gym adds the web backend, the interview session and the AI panel. Thank you, Jessa.

## Run it on your own computer

You need Node 20+ and an [Anthropic API key](https://console.anthropic.com/).

```bash
git clone https://github.com/buildwithzehra-creator/whiteboard-gym.git
cd whiteboard-gym
npm install
cp .env.example .env.local     # then paste your ANTHROPIC_API_KEY into it
npm run dev                    # open http://localhost:3000
```

Add `?demo` to the address to try the canvas offline with no key.

## How it fits together

| Part | Where |
| --- | --- |
| Canvas (plain HTML/CSS/JS, no build step) | `web/` |
| The one place the canvas talks to the outside world | `web/bridge.js` |
| AI endpoints (Vercel functions) | `api/` |
| Database schema (Supabase) | `supabase/schema.sql` |
| Prompt library seed | `data/prompts-raw.json` |
| Local dev server | `scripts/dev.mjs` |
| Original Mochiboard Mac app (Swift) and its README | `Sources/`, `MOCHIBOARD-README.md` |

## Deploy your own

Import the repo in Vercel, add `ANTHROPIC_API_KEY` under Environment Variables, deploy. No build step.

## License

MIT. See [LICENSE](LICENSE).
