import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { VoteSessionManager } from '../utils/vote-sessions';
import { buildVotingHubEmbed, buildVotingHubComponents } from '../utils/vote-embed-builder';

export const customId = 'vote-points-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  // Parse customId: vote-points-modal:{guildId}:{submissionIndex}
  const parts = interaction.customId.split(':');
  const guildId = parts[1];
  const submissionIndex = parseInt(parts[2]);

  if (!guildId || isNaN(submissionIndex)) {
    await interaction.reply({
      content: 'Invalid interaction! Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get session
  const session = VoteSessionManager.getSession(interaction.user.id, guildId);
  if (!session) {
    await interaction.reply({
      content: 'Your voting session has expired. Please run `/vote` again.',
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

  const round = getCurrentRound(league);
  if (!round || round.status !== 'voting') {
    await interaction.reply({
      content: 'Voting is not currently open!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Parse points from modal
  const pointsStr = interaction.fields.getTextInputValue('points');
  const points = parseInt(pointsStr);

  // Validate points
  if (isNaN(points) || points < 0 || points > 10) {
    await interaction.reply({
      content: 'Please enter a number between 0 and 10.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Update session with new points
  VoteSessionManager.updatePoints(interaction.user.id, guildId, submissionIndex, points);

  // Get updated session
  const updatedSession = VoteSessionManager.getSession(interaction.user.id, guildId);
  if (!updatedSession) {
    await interaction.reply({
      content: 'Session error. Please run `/vote` again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Build updated embed and components
  const newEmbed = buildVotingHubEmbed(round, updatedSession);
  const components = buildVotingHubComponents(
    guildId,
    round,
    updatedSession.displayOrder,
    updatedSession.votableSongIndices,
    updatedSession.pointAllocations
  );

  // Update the hub message - use deferUpdate + editReply for modal from select menu
  try {
    await interaction.deferUpdate();
    await interaction.editReply({
      embeds: [newEmbed],
      components
    });
  } catch (error) {
    console.error('Failed to update voting hub:', error);
    // Fallback: send ephemeral reply
    try {
      await interaction.reply({
        content: 'Points saved! The display may not have updated - run `/vote` again to see current totals.',
        flags: MessageFlags.Ephemeral
      });
    } catch {
      // Already replied, ignore
    }
  }
}
