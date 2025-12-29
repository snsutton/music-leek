import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SpotifyOAuthService } from '../services/spotify-oauth-service';

export const data = new SlashCommandBuilder()
  .setName('connect-spotify')
  .setDescription('Connect your Spotify account for playlist creation');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const authUrl = SpotifyOAuthService.generateAuthUrl(
      interaction.user.id,
      interaction.guildId || 'dm'
    );

    const button = new ButtonBuilder()
      .setLabel('Connect Spotify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(authUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await interaction.reply({
      content: '🎵 **Connect your Spotify account**\n\n' +
               'Click the button below to authorize Music Leek to create playlists on your behalf.\n\n' +
               'After connecting, use `/migrate-spotify` to enable playlist creation for your league.',
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    console.error('[ConnectSpotify] Failed to generate auth URL:', error);
    await interaction.reply({
      content: '❌ Spotify OAuth is not configured on this bot.',
      ephemeral: true
    });
  }
}
