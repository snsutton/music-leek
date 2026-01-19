import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Storage } from '../utils/storage';
import { isAdmin } from '../utils/permissions';
import { SpotifyOAuthService } from '../services/spotify-oauth-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('reconnect-spotify')
  .setDescription('Reconnect your Spotify account to update permissions (admin only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guildId } = resolveGuildContext(interaction);

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command requires league context.\n\n' +
               'Please run this command from the server where your league is hosted.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only league admins can reconnect Spotify!', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const authUrl = SpotifyOAuthService.generateAuthUrl(interaction.user.id, guildId);

    const button = new ButtonBuilder()
      .setLabel('Reconnect Spotify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(authUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await interaction.reply({
      content: '🔄 **Reconnect Spotify Account**\n\n' +
               'Click the button below to re-authorize Music Leek with your Spotify account.\n\n' +
               'This is useful if:\n' +
               '• Your token has expired\n' +
               '• New permissions are required\n' +
               '• You want to connect a different Spotify account',
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
