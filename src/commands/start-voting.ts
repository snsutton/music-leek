import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { VotingService } from '../services/voting-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('start-voting')
  .setDescription('End song submission phase and start voting early (admin only)')
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
    await interaction.reply({ content: 'Only league admins can start voting!', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Voting has already started or round is complete!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.submissions.length === 0) {
    await interaction.reply({ content: 'No submissions yet!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Defer reply as ephemeral - public notifications are sent separately by VotingService
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await VotingService.initiateVotingTransition(interaction.client, league, round, {
      logPrefix: 'StartVoting'
    });

    // Reload league to get updated participant count
    const updatedLeague = Storage.getLeagueByGuild(guildId)!;

    if (result.status === 'pending_confirmation') {
      // Playlist created, waiting for creator confirmation
      await interaction.editReply({
        content: `✅ Playlist created! Check your DMs to confirm it's public and start voting.`
      });
    } else if (result.status === 'failed') {
      // Playlist creation failed
      await interaction.editReply({
        content: `❌ **Spotify Playlist Creation Failed**\n\n` +
                 `Could not create the Spotify playlist for Round ${round.roundNumber}.\n\n` +
                 (result.error ? `**Error:** ${result.error}\n\n` : '') +
                 `All league admins have been notified. Please check your Spotify connection with \`/reconnect-spotify\` and try again.`
      });
    } else {
      // Completed immediately (no Spotify integration) - public notification already sent by VotingService
      await interaction.editReply({
        content: `✅ Voting started! Notifications sent to ${updatedLeague.participants.length} participants.`
      });
    }
  } catch (error) {
    console.error('[StartVoting] Error starting voting:', error);
    await interaction.editReply({
      content: '❌ Failed to start voting. Please try again.'
    });
  }
}
