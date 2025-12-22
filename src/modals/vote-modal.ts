import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Vote } from '../types';
import { getCurrentRound } from '../utils/helpers';

export const customId = 'vote-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const votesString = interaction.fields.getTextInputValue('votes');

  // Extract guildId from customId (format: "vote-modal:guildId")
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({ content: 'Invalid vote! Please try again.', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are not in this league! Use `/join-league` first.', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'voting') {
    await interaction.reply({ content: 'Voting phase has not started or has ended!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (Date.now() > round.votingDeadline) {
    await interaction.reply({ content: 'Voting deadline has passed!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Parse votes
  const voteEntries = votesString.split(',').map(v => v.trim());
  const parsedVotes: { submissionIndex: number; points: number }[] = [];

  try {
    for (const entry of voteEntries) {
      const [indexStr, pointsStr] = entry.split(':');
      const submissionIndex = parseInt(indexStr) - 1; // Convert to 0-based index
      const points = parseInt(pointsStr);

      if (isNaN(submissionIndex) || isNaN(points)) {
        throw new Error('Invalid format');
      }

      if (submissionIndex < 0 || submissionIndex >= round.submissions.length) {
        throw new Error(`Invalid submission number: ${submissionIndex + 1}`);
      }

      // Check if voting for own song
      if (round.submissions[submissionIndex].userId === interaction.user.id) {
        await interaction.reply({ content: 'You cannot vote for your own song!', flags: MessageFlags.Ephemeral });
        return;
      }

      parsedVotes.push({ submissionIndex, points });
    }
  } catch (error) {
    await interaction.reply({
      content: 'Invalid vote format! Use format like: "1:5,2:4,3:3" where numbers are submission#:points',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Remove existing vote if any
  const existingVoteIndex = round.votes.findIndex(v => v.voterId === interaction.user.id);
  if (existingVoteIndex !== -1) {
    round.votes.splice(existingVoteIndex, 1);
  }

  const vote: Vote = {
    voterId: interaction.user.id,
    votes: parsedVotes
  };

  round.votes.push(vote);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `✅ Your votes have been recorded for **${league.name}**!\n\nVotes cast: ${round.votes.length}/${league.participants.length}`,
    flags: MessageFlags.Ephemeral
  });
}
