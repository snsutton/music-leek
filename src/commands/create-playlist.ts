import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { SpotifyPlaylistService } from '../services/spotify-playlist-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('create-playlist')
  .setDescription('Create or recreate the Spotify playlist for the current voting round (admin only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Resolve guild context (server or DM)
  const { guildId } = resolveGuildContext(interaction);

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command requires league context.\n\n' +
               'Please run this command from the server where your league is hosted, ' +
               'or wait for a notification from your league.',
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
    await interaction.reply({ content: 'Only league admins can create playlists!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!league.spotifyIntegration) {
    await interaction.reply({
      content: '❌ No Spotify account connected to this league!\n\n' +
               'The league creator needs to connect their Spotify account using the button from `/create-league`.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'voting') {
    await interaction.reply({
      content: 'Playlist creation is only available during the voting phase!\n\n' +
               'Use `/start-voting` to start the voting phase first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (round.submissions.length === 0) {
    await interaction.reply({ content: 'No submissions to create a playlist from!', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    console.log(`[CreatePlaylist] Creating Spotify playlist for round ${round.roundNumber}...`);
    console.log(`[CreatePlaylist] League has ${round.submissions.length} submissions`);

    // Log submission URLs for debugging
    round.submissions.forEach((sub, i) => {
      console.log(`[CreatePlaylist] Submission ${i + 1}: ${sub.songUrl}`);
    });

    const guild = interaction.guild || await interaction.client.guilds.fetch(guildId);
    const playlistData = await SpotifyPlaylistService.createRoundPlaylist(league, round, guild?.name);

    if (!playlistData) {
      console.error(`[CreatePlaylist] createRoundPlaylist returned null for round ${round.roundNumber}`);

      // Check if submissions are Spotify links
      const nonSpotifyLinks = round.submissions.filter(sub => !sub.songUrl.includes('spotify.com'));
      if (nonSpotifyLinks.length > 0) {
        await interaction.editReply({
          content: `❌ Failed to create playlist. Found ${nonSpotifyLinks.length} non-Spotify submission(s).\n\n` +
                   `All submissions must be Spotify links. Non-Spotify links:\n` +
                   nonSpotifyLinks.map(s => `• ${s.songTitle} by ${s.artist}`).join('\n')
        });
        return;
      }

      await interaction.editReply({
        content: '❌ Failed to create playlist. Possible issues:\n\n' +
                 '• Spotify access token may have expired\n' +
                 '• Invalid Spotify links in submissions\n' +
                 '• Spotify API error\n\n' +
                 'Check the bot logs for more details. You may need to reconnect your Spotify account.'
      });
      return;
    }

    // Update round with playlist data
    round.playlist = {
      playlistId: playlistData.playlistId,
      playlistUrl: playlistData.playlistUrl,
      createdAt: playlistData.createdAt,
      trackCount: playlistData.trackCount
    };
    round.shuffledOrder = playlistData.shuffledOrder;
    Storage.saveLeague(league);

    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle('✅ Spotify Playlist Created!')
      .setDescription(
        `Successfully created playlist for **Round ${round.roundNumber}**\n\n` +
        `🎧 **[Listen to all submissions](${playlistData.playlistUrl})**\n\n` +
        `**Tracks:** ${playlistData.trackCount}\n` +
        `**Prompt:** ${round.prompt}`
      )
      .setFooter({ text: 'Share this link with participants or use `/league-status` to print it for them in channel!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    console.log(`[CreatePlaylist] Playlist created successfully: ${playlistData.playlistUrl}`);
  } catch (error) {
    console.error('[CreatePlaylist] Error creating playlist:', error);
    await interaction.editReply({
      content: '❌ An error occurred while creating the playlist. Please try again or contact support.'
    });
  }
}
