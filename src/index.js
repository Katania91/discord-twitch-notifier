import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import Database from './database.js';
import TwitchAPI from './twitch.js';
import StreamMonitor from './monitor.js';

dotenv.config();

console.log('---------------------------------------------');
console.log(' Discord Twitch Notifier - created by Katania91');
console.log('---------------------------------------------');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
    console.log(`✅ Command loaded: ${command.default.data.name}`);
  } else {
    console.log(`⚠️  Command in ${file} is missing "data" or "execute"`);
  }
}

const db = new Database();
await db.init();

const twitchAPI = new TwitchAPI(
  process.env.TWITCH_CLIENT_ID,
  process.env.TWITCH_CLIENT_SECRET
);

const monitor = new StreamMonitor(client, db, twitchAPI);

client.db = db;
client.twitchAPI = twitchAPI;
client.monitor = monitor;

client.once(Events.ClientReady, async (c) => {
  console.log(`🚀 Bot online as ${c.user.tag}`);
  console.log(`📊 In ${c.guilds.cache.size} servers`);
  
  try {
    await twitchAPI.authenticate();
    console.log('✅ Authenticated with Twitch API');
  } catch (error) {
    console.error('❌ Twitch authentication error:', error);
  }
  
  monitor.start();
  console.log('👀 Stream monitor started');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command || !command.autocomplete) {
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`❌ Autocomplete error ${interaction.commandName}:`, error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ Command ${interaction.commandName} not found`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Command execution error ${interaction.commandName}:`, error);
    const errorMessage = { 
      content: '❌ An error occurred while running the command!', 
      ephemeral: true 
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

client.on(Events.GuildCreate, (guild) => {
  console.log(`➕ Bot added to server: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildDelete, async (guild) => {
  console.log(`➖ Bot removed from server: ${guild.name} (${guild.id})`);
  await db.deleteGuildConfig(guild.id);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down bot...');
  monitor.stop();
  await db.close();
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
