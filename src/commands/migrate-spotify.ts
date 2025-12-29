import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Storage } from '../utils/storage';
import { League } from '../types';
import { TokenStorageService } from '../services/token-storage';
import axios from 'axios';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const data = new SlashCommandBuilder()
  .setName('migrate-spotify')
  .setDescription('[Admin] Add Spotify integration to an existing league');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is an admin of any league
    const leagues = Storage.getAllLeagues();
    const userLeagues = leagues.filter((league: League) =>
      league.guildId === interaction.guildId &&
      league.admins.includes(interaction.user.id)
    );

    if (userLeagues.length === 0) {
      await interaction.editReply({
        content: '❌ You must be a league admin to use this command.'
      });
      return;
    }

    // For simplicity, migrate the first league if user has multiple
    const league = userLeagues[0];

    // Check if already migrated
    if (league.spotifyIntegration) {
      await interaction.editReply({
        content: `✅ League "${league.name}" already has Spotify integration.\n\n` +
                 `**Connected by:** <@${league.spotifyIntegration.connectedBy}>\n` +
                 `**Connected at:** <t:${Math.floor(league.spotifyIntegration.connectedAt / 1000)}:F>`
      });
      return;
    }

    // Check if user has Spotify tokens
    const tokenData = await TokenStorageService.getToken(interaction.user.id);
    if (!tokenData) {
      await interaction.editReply({
        content: '❌ You need to connect your Spotify account first.\n\n' +
                 '**Steps:**\n' +
                 '1. Run `/connect-spotify`\n' +
                 '2. Click the "Connect Spotify Account" button\n' +
                 '3. Authorize on Spotify\n' +
                 '4. Run this command again'
      });
      return;
    }

    // Get Spotify user ID from the access token
    let spotifyUserId: string;
    try {
      const response = await axios.get<{ id: string }>(`${SPOTIFY_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${tokenData.accessToken}`
        }
      });
      spotifyUserId = response.data.id;
    } catch (error: any) {
      console.error('[MigrateSpotify] Failed to get Spotify user ID:', error.response?.data || error.message);
      await interaction.editReply({
        content: '❌ Failed to verify your Spotify account. Your token may have expired.\n\n' +
                 'Please reconnect using `/connect-spotify`.'
      });
      return;
    }

    // Add Spotify integration to the league
    league.spotifyIntegration = {
      userId: spotifyUserId,
      connectedBy: interaction.user.id,
      connectedAt: Date.now()
    };

    // Save the updated league
    Storage.saveLeague(league);

    console.log(`[MigrateSpotify] Successfully migrated league "${league.name}" for user ${interaction.user.id}, Spotify ID: ${spotifyUserId}`);

    await interaction.editReply({
      content: `✅ **Migration successful!**\n\n` +
               `League "${league.name}" now has Spotify integration enabled.\n\n` +
               `**Spotify User ID:** ${spotifyUserId}\n` +
               `**Connected by:** <@${interaction.user.id}>\n\n` +
               `🎵 Playlists will now be automatically created when you run \`/start-voting\`.`
    });

  } catch (error) {
    console.error('[MigrateSpotify] Error during migration:', error);
    await interaction.editReply({
      content: '❌ An error occurred during migration. Please check the logs.'
    });
  }
}
