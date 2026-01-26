// Load environment variables FIRST, before any other imports
import './env';

import { Client, Collection, GatewayIntentBits, Events, Partials } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { MusicServiceFactory } from './services/music-service-factory';
import { Scheduler } from './services/scheduler';

// HTTP server reference for graceful shutdown
let httpServer: any = null;

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

interface ComponentHandler {
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
const componentHandlers = new Collection<string, ComponentHandler>();

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

// Load component handlers
const componentsPath = path.join(__dirname, 'components');
if (fs.existsSync(componentsPath)) {
  const componentFiles = fs.readdirSync(componentsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of componentFiles) {
    const filePath = path.join(componentsPath, file);
    const component = require(filePath);

    if ('customId' in component && 'execute' in component) {
      componentHandlers.set(component.customId, component);
      console.log(`Loaded component handler: ${component.customId}`);
    } else {
      console.log(`Warning: The component handler at ${filePath} is missing required "customId" or "execute" property.`);
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
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      } catch {
        // Interaction may have expired, ignore
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
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while processing your submission!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while processing your submission!', ephemeral: true });
        }
      } catch {
        // Interaction may have expired, ignore
      }
    }
  }

  // Handle message component interactions (buttons, select menus)
  if (interaction.isMessageComponent()) {
    // Extract base customId (before any colon separator used for passing data)
    const baseCustomId = interaction.customId.split(':')[0];
    const handler = componentHandlers.get(baseCustomId);

    if (!handler) {
      console.error(`No component handler matching ${interaction.customId} was found.`);
      return;
    }

    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while processing your interaction!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while processing your interaction!', ephemeral: true });
        }
      } catch {
        // Interaction may have expired, ignore
      }
    }
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is not set in .env file!');
  process.exit(1);
}

// Set up health check HTTP server for Railway
// Only start if PORT is set (production) or explicitly enabled
const shouldStartHttpServer = process.env.PORT || process.env.ENABLE_HTTP_SERVER === 'true';

if (shouldStartHttpServer) {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || '3000');

    console.log(`[HTTP] Attempting to start health check server on port ${PORT}...`);

    app.get('/health', (req, res) => {
      console.log(`[HTTP] Health check request received from ${req.ip}`);
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        bot: client.user ? {
          username: client.user.tag,
          ready: client.isReady()
        } : {
          ready: false
        }
      });
    });

    // Spotify OAuth callback
    app.get('/spotify/callback', async (req, res) => {
      const { code, state, error } = req.query;

      if (error) {
        console.error(`[HTTP] Spotify OAuth error: ${error}`);
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Spotify Connection Failed</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Connection Failed</h1>
            <p>Error: ${error}</p>
            <p>Please try again in Discord.</p>
          </body>
          </html>
        `);
        return;
      }

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send('Missing or invalid code/state parameters');
        return;
      }

      try {
        const { SpotifyOAuthService } = await import('./services/spotify-oauth-service');
        const { Storage } = await import('./utils/storage');
        const result = await SpotifyOAuthService.handleCallback(code, state);

        console.log(`[HTTP] Spotify OAuth successful for Discord user ${result.discordUserId}`);

        // Update league with Spotify integration
        const league = Storage.getLeagueByGuild(result.guildId);
        if (league) {
          league.spotifyIntegration = {
            userId: result.spotifyUserId,
            connectedBy: result.discordUserId,
            connectedAt: new Date().toISOString()
          };
          Storage.saveLeague(league);
          console.log(`[HTTP] Updated league ${league.name} with Spotify integration`);
        }

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Spotify Connected</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
              h1 { color: #1DB954; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Spotify Connected Successfully!</h1>
              <p>You can now close this window and return to Discord.</p>
              <p>Music Leek can now create playlists for your league.</p>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        console.error('[HTTP] Spotify OAuth callback error:', error);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Connection Failed</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Connection Failed</h1>
            <p>An error occurred while connecting your Spotify account.</p>
            <p>Please try again in Discord.</p>
          </body>
          </html>
        `);
      }
    });

    // Privacy policy (required by Spotify)
    app.get('/privacy', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Music Leek - Privacy Policy</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
            h1 { color: #1DB954; }
          </style>
        </head>
        <body>
          <h1>Music Leek Privacy Policy</h1>
          <p><strong>Last updated:</strong> ${new Date().toLocaleDateString()}</p>

          <h2>What We Store</h2>
          <p>Music Leek stores only the information necessary to create Spotify playlists on your behalf:</p>
          <ul>
            <li>Your Spotify user ID</li>
            <li>OAuth access and refresh tokens (encrypted)</li>
          </ul>

          <h2>What We Don't Access</h2>
          <p>We do NOT access or store:</p>
          <ul>
            <li>Your Spotify password</li>
            <li>Your listening history</li>
            <li>Your saved songs or playlists (except playlists we create for you)</li>
            <li>Your payment information</li>
            <li>Your email address or personal information</li>
          </ul>

          <h2>How We Use Your Data</h2>
          <p>We use your Spotify tokens exclusively to create playlists containing submitted songs when voting begins in your Music Leek league.</p>

          <h2>Data Security</h2>
          <p>All OAuth tokens are encrypted at rest using AES-256 encryption.</p>

          <h2>Revoking Access</h2>
          <p>You can revoke Music Leek's access to your Spotify account at any time through your Spotify account settings.</p>

          <h2>Contact</h2>
          <p>For questions about this privacy policy, please create an issue on our GitHub repository.</p>
        </body>
        </html>
      `);
    });

    httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[HTTP] ✓ Health check server listening on port ${PORT}`);
      console.log(`[HTTP] Health endpoint available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('[HTTP] FATAL: Failed to start health check server:', error);
    // Don't exit - let bot continue even if HTTP fails
  }
} else {
  console.log('[HTTP] Skipping health check server (not needed in development)');
}

// Initialize music services and then login
async function startBot() {
  try {
    // Initialize music services
    await MusicServiceFactory.initialize();
    const platforms = MusicServiceFactory.getSupportedPlatforms();
    console.log(`Music services initialized: ${platforms.join(', ') || 'none'}`);

    // Login to Discord
    await client.login(token);

    // Start scheduler after bot is ready
    Scheduler.start(client);
    console.log('Background scheduler started');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler for Railway zero-downtime deployments
function gracefulShutdown(signal: string) {
  console.log(`\n[SHUTDOWN] Received ${signal}, gracefully shutting down...`);

  // Close HTTP server first to stop accepting new connections
  if (httpServer) {
    httpServer.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
    });
  }

  // Stop scheduler
  Scheduler.stop();
  console.log('[SHUTDOWN] Scheduler stopped');

  // Destroy Discord client connection
  if (client) {
    console.log('[SHUTDOWN] Closing Discord connection...');
    client.destroy();
  }

  console.log('[SHUTDOWN] Shutdown complete');
  process.exit(0);
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the bot with proper error handling
startBot().catch(error => {
  console.error('Fatal error starting bot:', error);
  process.exit(1);
});
