import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Vote } from '../types';
import { getCurrentRound, getMissingVoters } from '../utils/helpers';
import { VoteSessionManager } from '../utils/vote-sessions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';

export const customId = 'vote-points-modal';

const POINTS_BUDGET = 10;

export async function execute(interaction: ModalSubmitInteraction) {
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid vote! Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get session
  const session = VoteSessionManager.getSession(interaction.user.id, guildId);
  if (!session) {
    await interaction.reply({
      content: 'Vote session expired! Please start over with `/vote`.',
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
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'You are not in this league!',
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  const round = getCurrentRound(league);
  if (!round) {
    await interaction.reply({
      content: 'No active round!',
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  if (round.status !== 'voting') {
    await interaction.reply({
      content: 'Voting phase has ended!',
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  if (Date.now() > round.votingDeadline) {
    await interaction.reply({
      content: 'Voting deadline has passed!',
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  // Parse points
  const parsedVotes: { submissionIndex: number; points: number }[] = [];
  let totalPoints = 0;

  try {
    for (const index of session.selectedSongIndices) {
      const fieldValue = interaction.fields.getTextInputValue(`points-${index}`);
      const points = parseInt(fieldValue);

      if (isNaN(points) || points < 0) {
        throw new Error(`Invalid points for submission ${index + 1}`);
      }

      if (points > 0) {
        // Check self-voting
        if (round.submissions[index].userId === interaction.user.id) {
          await interaction.reply({
            content: 'You cannot vote for your own song!',
            flags: MessageFlags.Ephemeral
          });
          VoteSessionManager.deleteSession(interaction.user.id, guildId);
          return;
        }

        parsedVotes.push({ submissionIndex: index, points });
        totalPoints += points;
      }
    }

    // Validate total
    if (totalPoints > POINTS_BUDGET) {
      await interaction.reply({
        content: `❌ You allocated **${totalPoints} points**, but only have **${POINTS_BUDGET}** available!\n\n` +
                 `Please reduce your allocation.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (totalPoints === 0) {
      await interaction.reply({
        content: 'You must allocate at least 1 point!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

  } catch (error: any) {
    await interaction.reply({
      content: `Invalid points! ${error.message}`,
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  // Remove existing vote
  const existingVoteIndex = round.votes.findIndex(v => v.voterId === interaction.user.id);
  if (existingVoteIndex !== -1) {
    round.votes.splice(existingVoteIndex, 1);
  }

  // Save vote
  const vote: Vote = {
    voterId: interaction.user.id,
    votes: parsedVotes
  };

  round.votes.push(vote);
  Storage.saveLeague(league);

  VoteSessionManager.deleteSession(interaction.user.id, guildId);

  const totalVotes = round.votes.length;
  const totalParticipants = league.participants.length;

  await interaction.reply({
    content: `✅ Your votes have been recorded!\n\n` +
             `Points used: ${totalPoints}/${POINTS_BUDGET}\n` +
             `Total votes in round: ${totalVotes}/${totalParticipants}`,
    flags: MessageFlags.Ephemeral
  });

  // Get missing voters
  const missingVoterIds = getMissingVoters(league, round);

  // Send reminders when 3 or fewer voters remain (similar to submission logic)
  if (missingVoterIds.length > 0 && missingVoterIds.length <= 3) {
    const reminderEmbed = NotificationTemplates.votingRunningOut(league, round, missingVoterIds.length);
    await NotificationService.sendBulkDM(
      interaction.client,
      missingVoterIds,
      { embeds: [reminderEmbed] }
    );
  }

  // Check if all participants have voted
  if (totalVotes === totalParticipants && !round.notificationsSent.allVotesReceived) {
    const adminEmbed = NotificationTemplates.allVotesReceived(league, round);

    await NotificationService.sendBulkDM(
      interaction.client,
      league.admins,
      { embeds: [adminEmbed] }
    );

    round.notificationsSent.allVotesReceived = true;
    Storage.saveLeague(league);
  }
}
