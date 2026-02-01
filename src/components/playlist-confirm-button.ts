import { ButtonInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { VotingService } from '../services/voting-service';

export const customId = 'playlist-confirm';

export async function execute(interaction: ButtonInteraction) {
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid interaction!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);
  if (!league) {
    await interaction.reply({
      content: 'League not found!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Only league admins can confirm
  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({
      content: 'Only league admins can confirm the playlist is public.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const round = getCurrentRound(league);
  if (!round) {
    await interaction.reply({
      content: 'No active round found!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if we're in the expected state (waiting for confirmation)
  if (!round.playlistConfirmation) {
    await interaction.reply({
      content: 'No pending playlist confirmation for this round. Voting may have already started.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Defer update since we'll be sending notifications
  await interaction.deferUpdate();

  try {
    // Complete the voting transition (sends notifications to all players)
    await VotingService.completeVotingTransition(interaction.client, league, round, {
      logPrefix: 'PlaylistConfirm'
    });

    // Update the message to show success
    await interaction.editReply({
      content: `✅ **Playlist confirmed as public!**\n\n` +
               `Voting notifications have been sent to ${league.participants.length} participants.\n\n` +
               `Round ${round.roundNumber} is now in voting phase.`,
      embeds: [],
      components: []
    });
  } catch (error) {
    console.error('[PlaylistConfirm] Error completing voting transition:', error);
    await interaction.editReply({
      content: '❌ An error occurred while starting voting. Please try again or use `/start-voting` command.',
      embeds: [],
      components: []
    });
  }
}
