import { ButtonInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Vote } from '../types';
import { getCurrentRound, getMissingVoters, toTimestamp } from '../utils/helpers';
import { VoteSessionManager } from '../utils/vote-sessions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { Scheduler } from '../services/scheduler';
import { POINTS_BUDGET } from '../constants';

export const customId = 'vote-submit';

export async function execute(interaction: ButtonInteraction) {
  const guildId = interaction.customId.split(':')[1];

  console.log(`[Vote] user:${interaction.user.id} submitting votes for guild:${guildId}`);

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid interaction!',
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

  if (Date.now() > toTimestamp(round.votingDeadline)) {
    await interaction.reply({
      content: 'Voting deadline has passed!',
      flags: MessageFlags.Ephemeral
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  // Calculate total points
  const totalPoints = [...session.pointAllocations.values()].reduce((a, b) => a + b, 0);

  // Validate total points
  if (totalPoints > POINTS_BUDGET) {
    await interaction.reply({
      content: `⚠️ You've allocated **${totalPoints} points** but only have **${POINTS_BUDGET}** available.\n\n` +
               `Please adjust your votes before submitting.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (totalPoints === 0) {
    await interaction.reply({
      content: 'You must allocate at least 1 point to submit your vote.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Build vote from session allocations
  const parsedVotes = [...session.pointAllocations.entries()]
    .filter(([, points]) => points > 0)
    .map(([submissionIndex, points]) => ({ submissionIndex, points }));

  const vote: Vote = {
    voterId: interaction.user.id,
    votes: parsedVotes
  };

  // Atomically update the league to add this vote
  const updatedLeague = await Storage.atomicUpdate(guildId, (freshLeague) => {
    const freshRound = getCurrentRound(freshLeague);
    if (!freshRound || freshRound.status !== 'voting') {
      return null;
    }

    // Remove existing vote from this user (if re-voting)
    const existingIdx = freshRound.votes.findIndex(v => v.voterId === interaction.user.id);
    if (existingIdx !== -1) {
      freshRound.votes.splice(existingIdx, 1);
    }

    freshRound.votes.push(vote);
    return freshLeague;
  });

  if (!updatedLeague) {
    await interaction.update({
      content: 'The round state has changed. Please try again.',
      embeds: [],
      components: []
    });
    VoteSessionManager.deleteSession(interaction.user.id, guildId);
    return;
  }

  console.log(`[Vote] Saved ${parsedVotes.length} song votes (${totalPoints} points) for user:${interaction.user.id} in round:${round.roundNumber}`);

  VoteSessionManager.deleteSession(interaction.user.id, guildId);

  const updatedRound = getCurrentRound(updatedLeague)!;
  const totalVotes = updatedRound.votes.length;
  const totalParticipants = updatedLeague.participants.length;

  // Update the message to show success
  await interaction.update({
    content: `✅ **Your vote has been recorded!**\n\n` +
             `Points used: ${totalPoints}/${POINTS_BUDGET}\n` +
             `Total votes in round: ${totalVotes}/${totalParticipants}`,
    embeds: [],
    components: []
  });

  // Get missing voters
  const missingVoterIds = getMissingVoters(updatedLeague, updatedRound);

  // Channel message: When 1 voter remains (holding up the stage)
  if (missingVoterIds.length === 1) {
    try {
      const channel = await interaction.client.channels.fetch(updatedLeague.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        // Fetch username for the remaining voter
        const waitingUser = await interaction.client.users.fetch(missingVoterIds[0]);
        const waitingUsername = waitingUser?.username || 'Unknown User';

        await channel.send(
          `⏰ **Waiting on 1 player to vote!**\n\n` +
          `${waitingUsername}, we're waiting for you!\n\n` +
          `Use \`/vote\` to cast your votes.`
        );
      }
    } catch (error) {
      console.error('Failed to send final voter notification:', error);
    }
  }

  // Send reminders when 3 or fewer voters remain
  if (missingVoterIds.length > 0 && missingVoterIds.length <= 3) {
    const reminderEmbed = NotificationTemplates.votingRunningOut(updatedLeague, updatedRound, missingVoterIds.length);
    await NotificationService.sendBulkDM(
      interaction.client,
      missingVoterIds,
      { embeds: [reminderEmbed] },
      100,
      updatedLeague.guildId,
      'voting_reminder'
    );
  }

  // Auto-end round when all participants have voted
  if (totalVotes === totalParticipants && !updatedRound.notificationsSent.allVotesReceived) {
    console.log(`[Vote] All votes received for round ${updatedRound.roundNumber}, auto-ending round`);
    await Storage.atomicUpdate(guildId, (freshLeague) => {
      const freshRound = getCurrentRound(freshLeague);
      if (freshRound) {
        freshRound.notificationsSent.allVotesReceived = true;
      }
      return freshLeague;
    });
    Scheduler.autoEndRound(interaction.client, updatedLeague, updatedRound)
      .catch(err => console.error('[Vote] Failed to auto-end round:', err));
  }
}
