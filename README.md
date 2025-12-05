# Discord Twitch Notifier 💜🎮

A **Node.js Discord bot** that monitors selected **Twitch streamers** and posts rich “going live” embeds in your Discord server.

* ⚙️ Built with **Node.js 18+**, **discord.js v14** and the **Twitch API**
* 💾 Uses **MariaDB/MySQL** for persistent configuration and history
* 🛰️ Fully driven by **slash commands** (no legacy prefixes)
* 🧠 **One message per stream** – the bot edits a single embed while the stream is live instead of spamming new messages

---

## 📌 Highlights

* 🎯 Per-server Twitch streamer tracking
* 📝 Custom notification messages:

  * server-level template
  * per-streamer overrides
* 🧵 Optional **role mentions** (e.g. `@live`, `@twitch`, etc.)
* 🔍 Optional **title keyword filter** via `.env`
* 🔁 Smart live message updates:

  * title
  * game
  * viewer count
  * thumbnail with cache-busting
* 🗄️ MariaDB/MySQL storage for:

  * guild configuration
  * tracked streamers
  * stream history
* 🧩 Slash command deployment script included

---

## 📂 Table of Contents

* [Requirements](#-requirements)
* [Platform Credentials](#-platform-credentials)
* [Discord Bot Permissions & Invite](#-discord-bot-permissions--invite)
* [Quick Setup](#-quick-setup)
* [Environment Variables](#-environment-variables)
* [Database](#-database)
* [Slash Commands](#-slash-commands)
* [Message Variables](#-message-variables)
* [Title Keyword Filter](#-title-keyword-filter)
* [How It Works](#-how-it-works)
* [npm Scripts](#-npm-scripts)
* [Troubleshooting](#-troubleshooting)
* [Security Notes](#-security-notes)
* [Project Structure](#-project-structure)
* [License](#-license)

---

## ✅ Requirements

* **Node.js 18+** and **npm**
* **MariaDB** or **MySQL**
* **Discord application** with:

  * bot token
  * application/client ID
* **Twitch application** with:

  * client ID
  * client secret

---

## 🔑 Platform Credentials

### Discord

1. Go to **Discord Developer Portal**
   `https://discord.com/developers/applications`
2. Create a new **Application** and add a **Bot**.
3. Note down:

   * **Application ID** (client ID)
   * **Bot Token**

### Twitch

1. Go to **Twitch Developer Console**
   `https://dev.twitch.tv/console/apps`
2. Create a new application.
3. Note down:

   * **Client ID**
   * **Client Secret**

---

## 🎟️ Discord Bot Permissions & Invite

### Recommended scopes

* `bot`
* `applications.commands` (required for slash commands)

### Minimum bot permissions

* `Send Messages`
* `Embed Links`
* `Read Message History`

Optional but useful:

* `Manage Messages`

### Example invite URL

```text
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=81968&scope=bot%20applications.commands
```

`81968` corresponds to **Send Messages + Embed Links + Read Message History**.

---

## 🚀 Quick Setup

1. **Clone the repo and install dependencies**

   ```bash
   git clone https://github.com/<your-username>/discord-twitch-notifier.git
   cd discord-twitch-notifier
   npm install
   ```

2. **Create the `.env` file** in the project root
   (⚠️ do **not** commit this file – see [Environment Variables](#-environment-variables))

3. **Initialize the database** (one time)

   ```bash
   mysql -u <user> -p < database_full.sql
   ```

4. **Deploy slash commands**

   ```bash
   npm run deploy
   ```

   Run this again whenever you add or change slash commands.

5. **Start the bot**

   ```bash
   npm start
   ```

---

## 🔧 Environment Variables

Create a file named `.env` in the project root with:

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

# How often the bot polls Twitch (milliseconds)
CHECK_INTERVAL=60000

# (Optional) word/phrase that must appear in the stream title
# Leave empty to notify for every live stream
STREAM_TITLE_KEYWORD=
```

You can also commit a `.env.example` file (same keys, fake values) to document the configuration without exposing secrets.

---

## 🗄️ Database

The file **`database_full.sql`** contains the full schema, including tables for:

* per-guild configuration (channel, role, message templates, etc.)
* tracked streamers
* stream history

Apply it with:

```bash
mysql -u <user> -p < database_full.sql
```

Use the same script for new installs or to align an existing database schema.

---

## 🧩 Slash Commands

Main commands exposed by the bot:

| Command              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `/add-streamer`      | Add a streamer, with optional custom message           |
| `/edit-streamer`     | Edit or reset a streamer-specific message              |
| `/remove-streamer`   | Remove a monitored streamer                            |
| `/list-streamers`    | List all streamers configured for this guild           |
| `/set-channel`       | Set the channel used for notifications                 |
| `/set-role`          | Set or clear the role to be mentioned in notifications |
| `/set-message`       | Set the server-level message template                  |
| `/config`            | Show the current configuration                         |
| `/test-notification` | Send a test notification                               |
| `/help`              | Show a quick reference of all commands                 |

Typically only users with permissions like **Manage Server** should be allowed to run configuration commands.

---

## 🧱 Message Variables

Both server-level and streamer-level templates support placeholders:

* `{streamer}` → Twitch display name
* `{game}` → current game
* `{title}` → stream title
* `{url}` → Twitch stream URL
* `@role` → replaced with the configured role mention (set via `/set-role`, if any)

### Examples

Server-level template:

```text
@role {streamer} is now live on Twitch playing {game}!
{title}
{url}
```

Streamer-level override:

```text
@role 🚨 {streamer} just went live: "{title}" → {url}
```

If a **streamer-level** message exists, it takes precedence over the server-level template.

---

## 🎯 Title Keyword Filter

To reduce noise, you can filter notifications based on the stream title using `STREAM_TITLE_KEYWORD` in `.env`.

* Empty → **all** streams from tracked streamers trigger notifications
* Non-empty → notifications are sent **only** if the title contains that word/phrase (case-insensitive)

Examples:

```env
STREAM_TITLE_KEYWORD=speedrun
STREAM_TITLE_KEYWORD=duo queue
STREAM_TITLE_KEYWORD=
```

Restart the bot after changing this variable.

---

## 🧠 How It Works

1. Every `CHECK_INTERVAL` milliseconds, the bot:

   * reads the list of configured streamers from the database
   * queries the Twitch API for their live status

2. For each streamer:

   * if the streamer is live and passes the (optional) title filter:

     * if there is **no active message** stored for the current live session:

       * the bot sends a new embed in the configured channel and stores the message ID
     * if there **is** an active message:

       * the bot **edits** the existing message, updating:

         * title
         * game
         * viewer count
         * thumbnail (with cache-busting)
   * when the stream ends:

     * the bot stops updating that message until the next live session

3. All guild and streamer configuration is stored and read from MariaDB/MySQL.

Result: users get **one live embed per stream** that stays fresh, instead of a wall of repeated messages. 🔁

---

## 🧪 npm Scripts

| Script           | Description                           |
| ---------------- | ------------------------------------- |
| `npm start`      | Start the bot in production mode      |
| `npm run dev`    | Start the bot with `node --watch`     |
| `npm run deploy` | Register/update global slash commands |

---

## 🛠️ Troubleshooting

Quick checks if something doesn’t work:

1. **Bot doesn’t start**

   * Check console logs.
   * Verify `.env` values (Discord token, DB credentials, Twitch keys).

2. **No notifications in Discord**

   * Make sure you set a notification channel with `/set-channel`.
   * Verify the bot has:

     * `Send Messages`
     * `Embed Links`
   * Run `/config` to check the current channel, role and templates.
   * Try `/test-notification`.
   * If `STREAM_TITLE_KEYWORD` is set, confirm that the stream title actually contains it.

3. **Database errors**

   * Verify DB host/port/user/password/name in `.env`.
   * Confirm that `database_full.sql` has been imported into the correct database.

---

## 🔐 Security Notes

* Never commit:

  * `.env`
  * logs or dump files containing tokens/passwords
* Discord and Twitch tokens, plus DB credentials, should live **only** in environment variables.
* Before making the repo public, double-check:

  * no `.env` or backup copies are tracked
  * no DB dumps or sensitive debug files are included

---

## 📁 Project Structure

Indicative project layout:

```text
src/
  commands/
    add-streamer.js
    edit-streamer.js
    remove-streamer.js
    list-streamers.js
    set-channel.js
    set-role.js
    set-message.js
    config.js
    test-notification.js
    help.js
  database.js
  deploy-commands.js
  index.js
  monitor.js
  twitch.js

database_full.sql
package.json
README.md
```

File names may vary slightly, but the overall structure is similar.

---

## 📜 License

This project is licensed under the **MIT License**.
See the `LICENSE` file for full details.
