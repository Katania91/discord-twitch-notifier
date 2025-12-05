# Discord Twitch Notifier

Node.js Discord bot that monitors Twitch streamers via MariaDB/MySQL and posts rich Discord embeds. Title filtering is configurable via environment variable (or disabled entirely). All interactions use slash commands; the monitor loop reuses and updates a single message per stream.

## Highlights
- Centralized streamer tracking with optional title keyword filter.
- Discord embeds with per-streamer or server-level custom messages and role mentions.
- Smart message updates (title/game/viewer changes and cache-busting preview).
- MariaDB/MySQL storage with stream history and per-guild configuration.
- Slash-command deployment script included.

## Requirements
- Node.js 18+ and npm
- MariaDB/MySQL
- Discord application (bot) token and client ID
- Twitch client ID/secret

## Platform credentials (create these before .env)
- Discord: create an application + bot at https://discord.com/developers/applications. Copy the **Application ID** (client ID) and **Bot Token**.
- Twitch: create an app at https://dev.twitch.tv/console/apps. Copy the **Client ID** and **Client Secret**.

## Discord bot permissions to invite
- OAuth2 scopes: `bot` and `applications.commands` (for slash commands).
- Bot permissions: `Send Messages`, `Embed Links`, `Read Message History`. (Optional but useful: `Manage Messages` if you want the bot to tidy up its own messages.)
- Example invite URL template:
  `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=81968&scope=bot%20applications.commands`
  - `81968` corresponds to Send Messages + Embed Links + Read Message History.

## Quick setup (step-by-step)
1) Install dependencies
```bash
git clone <repo>
cd bot_twitch
npm install
```

2) Create `.env` in the project root (never commit this file)
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_app_client_id
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
DB_HOST=localhost
DB_PORT=3306
DB_NAME=discord_bot
DB_USER=root
DB_PASSWORD=your_db_password
CHECK_INTERVAL=60000          # how often to poll Twitch (ms)
STREAM_TITLE_KEYWORD=         # optional keyword filter; leave empty to disable
```

3) Initialize the database (one-time)
```bash
mysql -u <user> -p < database_full.sql
```

4) Deploy slash commands (run again if commands change)
```bash
npm run deploy
```

5) Start the bot
```bash
npm start
```

If you change `.env`, restart the bot to apply changes.

## Slash commands
| Command | Purpose |
| --- | --- |
| `/add-streamer` | Add a streamer with an optional custom message |
| `/edit-streamer` | Edit or reset a streamer-level message |
| `/remove-streamer` | Remove a monitored streamer |
| `/list-streamers` | Show monitored streamers for the guild |
| `/set-channel` | Set the notification channel |
| `/set-role` | Set or clear the role to mention |
| `/set-message` | Set the guild-level message template |
| `/config` | Display current configuration and interval |
| `/test-notification` | Send a test notification |
| `/help` | Quick reference guide |

## Message variables
Use these placeholders in server or streamer templates:
- `{streamer}` → display name
- `{game}` → current game
- `{title}` → stream title
- `{url}` → Twitch link
- `@role` → replaced with the configured role mention (if set)

## Database
- `database_full.sql` creates all tables (`guild_configs`, `streamers`, `stream_history`) with the latest columns and defaults. Use this single script for new or existing databases.

## Title keyword filter
- Purpose: avoid spam by notifying only when the stream title contains a word/phrase you care about.
- How to enable: set `STREAM_TITLE_KEYWORD` in `.env` to any word/phrase (case-insensitive). The bot sends/updates notifications only if the title contains it.
- How to disable: leave it empty (`STREAM_TITLE_KEYWORD=`) or remove the line. With no keyword, every live stream is notified.
- Examples:
  - `STREAM_TITLE_KEYWORD=speedrun` → notify only when the title contains "speedrun".
  - `STREAM_TITLE_KEYWORD=duo queue` → notify only when the title contains "duo queue".
  - `STREAM_TITLE_KEYWORD=` → keyword filter off (notify all live streams).
- Changes take effect after restarting the bot.

## How the bot works (plain English)
- Every `CHECK_INTERVAL` milliseconds, the bot fetches live status for all configured streamers via Twitch.
- If the streamer is live and the title keyword passes (or filtering is off), the bot sends one embed to the configured Discord channel and then keeps editing that same message with updated title/game/viewers.
- If the stream ends, the bot stops updating until the next live session.
- Per-streamer custom messages (set via `/edit-streamer`) override the guild message set via `/set-message`.
- Role mentions work by including `@role` in your templates; it is replaced with the configured role mention.

## npm scripts
| Script | Description |
| --- | --- |
| `npm start` | Run in production |
| `npm run dev` | Run with `node --watch` |
| `npm run deploy` | Register global slash commands |

## Debug & troubleshooting
- Check logs for DB connection, bot login, and monitor start.
- If notifications do not arrive:
  1. Ensure a notification channel is set and the bot has `SendMessages` + `EmbedLinks`.
  2. Run `/config` to confirm channel/role/messages.
  3. Use `/test-notification` to force a send.
  4. If using a keyword, verify the title contains it.
- For DB issues, verify credentials and that `database_full.sql` has been applied.

## Security
- Do not commit `.env` or secrets.
- Role and channel IDs live in the database; no tokens are stored there.
- Before publishing, remove internal files you do not want public (e.g., FINAL_CHECK_REPORT.md if it contains internal notes).

## Project layout
```
src/
  commands/
  database.js
  deploy-commands.js
  index.js
  monitor.js
  twitch.js
database_full.sql
package.json
```

## Contributing
1. Open an issue describing the bug/feature.
2. Create a branch, implement, and note manual tests in the PR.
3. Run `npm run deploy` only when commands change.
