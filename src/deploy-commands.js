import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command.default) {
    commands.push(command.default.data.toJSON());
    console.log(`✅ Caricato: ${command.default.data.name}`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Inizio deploy di ${commands.length} comandi slash...`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log(`✅ Deploy completato! ${data.length} comandi registrati.`);
    console.log('\n📝 Comandi registrati:');
    data.forEach(cmd => console.log(`   - /${cmd.name}`));
    console.log('\n⏰ I comandi saranno disponibili globalmente entro ~1 ora.');
    console.log('💡 Per test immediati, usa il deploy su un server specifico.');
  } catch (error) {
    console.error('❌ Errore durante il deploy:', error);
  }
})();
