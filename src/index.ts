import { Client, Collection, GatewayIntentBits, Events, Partials } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists, otherwise fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

interface Command {
  data: {
    name: string;
    toJSON: () => any;
  };
  execute: (interaction: any) => Promise<void>;
}

interface ModalHandler {
  customId: string;
  execute: (interaction: any) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel, // Required for DM channels
    Partials.Message,
  ]
});

const commands = new Collection<string, Command>();
const modalHandlers = new Collection<string, ModalHandler>();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(`Warning: The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Load modal handlers
const modalsPath = path.join(__dirname, 'modals');
if (fs.existsSync(modalsPath)) {
  const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file);
    const modal = require(filePath);

    if ('customId' in modal && 'execute' in modal) {
      modalHandlers.set(modal.customId, modal);
      console.log(`Loaded modal handler: ${modal.customId}`);
    } else {
      console.log(`Warning: The modal handler at ${filePath} is missing required "customId" or "execute" property.`);
    }
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const replyOptions = {
        content: 'There was an error while executing this command!',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    // Extract base customId (before any colon separator used for passing data)
    const baseCustomId = interaction.customId.split(':')[0];
    const handler = modalHandlers.get(baseCustomId);

    if (!handler) {
      console.error(`No modal handler matching ${interaction.customId} was found.`);
      return;
    }

    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(error);
      const replyOptions = {
        content: 'There was an error while processing your submission!',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is not set in .env file!');
  process.exit(1);
}

client.login(token);
