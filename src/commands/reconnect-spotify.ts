import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SpotifyOAuthService } from '../services/spotify-oauth-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('reconnect-spotify')
  .setDescription('Reconnect the bot\'s Spotify account (developer only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  const developerDiscordId = process.env.DEVELOPER_DISCORD_ID;

  if (!developerDiscordId || interaction.user.id !== developerDiscordId) {
    await interaction.reply({
      content: '❌ Only the bot developer can reconnect the Spotify integration.\n\n' +
               'If you are experiencing Spotify issues, please contact the bot administrator.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const { guildId } = resolveGuildContext(interaction);
  const contextGuildId = guildId || 'unknown';

  try {
    const authUrl = SpotifyOAuthService.generateBotAuthUrl(interaction.user.id, contextGuildId);

    const button = new ButtonBuilder()
      .setLabel('Reconnect Bot Spotify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(authUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await interaction.reply({
      content: '🔄 **Reconnect Bot Spotify Account**\n\n' +
               'Click the button below to re-authorize the bot\'s Spotify account.\n\n' +
               'This reconnects the single shared Spotify account used for all playlist creation.',
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[ReconnectSpotify] Failed to generate auth URL:', error);
    await interaction.reply({
      content: '❌ Failed to generate Spotify authorization URL. Please check the bot configuration.',
      flags: MessageFlags.Ephemeral
    });
  }
}
