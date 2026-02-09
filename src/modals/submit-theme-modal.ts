import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { ThemeSubmission } from '../types';
import { getCurrentRound, toTimestamp, toISOString } from '../utils/helpers';

export const customId = 'submit-theme-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const theme = interaction.fields.getTextInputValue('theme');

  // Defer reply
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Extract guildId and validate league/round
  const guildId = interaction.customId.split(':')[1];

  console.log(`[Theme] user:${interaction.user.id} submitting theme for guild:${guildId}`);

  if (!guildId) {
    await interaction.editReply({ content: 'Invalid submission! Please try again.' });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.editReply({ content: 'League not found!' });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.editReply({ content: 'You are not in this league! Use `/join-league` first.' });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.editReply({ content: 'No active round!' });
    return;
  }

  if (round.status !== 'theme-submission') {
    await interaction.editReply({ content: 'Theme submission phase has ended!' });
    return;
  }

  if (!round.themeSubmissionDeadline || Date.now() > toTimestamp(round.themeSubmissionDeadline)) {
    await interaction.editReply({ content: 'Theme submission deadline has passed!' });
    return;
  }

  // Normalize theme for duplicate detection
  const normalizedTheme = theme.toLowerCase().trim().replace(/\s+/g, ' ');

  // Check for duplicate themes from other users
  const duplicateTheme = round.themeSubmissions?.find(t => {
    // Skip the current user's submission (they can change their own theme)
    if (t.userId === interaction.user.id) {
      return false;
    }

    // Compare normalized themes
    const existingNormalized = t.theme.toLowerCase().trim().replace(/\s+/g, ' ');
    return existingNormalized === normalizedTheme;
  });

  if (duplicateTheme) {
    await interaction.editReply({
      content: `❌ This theme has already been submitted by another player!\n\n` +
               `Please submit a different theme idea.`
    });
    return;
  }

  // Check if this is a resubmission (for display purposes)
  const isResubmission = round.themeSubmissions?.some(t => t.userId === interaction.user.id) ?? false;

  // Create theme submission
  const submission: ThemeSubmission = {
    userId: interaction.user.id,
    theme: theme.trim(),
    submittedAt: toISOString()
  };

  // Atomically update the league to add this theme submission
  const updatedLeague = await Storage.atomicUpdate(guildId, (freshLeague) => {
    const freshRound = getCurrentRound(freshLeague);
    if (!freshRound || freshRound.status !== 'theme-submission') {
      return null;
    }

    if (!freshRound.themeSubmissions) {
      freshRound.themeSubmissions = [];
    }

    // Remove existing submission by this user (allows resubmission)
    const existingIdx = freshRound.themeSubmissions.findIndex(t => t.userId === interaction.user.id);
    if (existingIdx !== -1) {
      freshRound.themeSubmissions.splice(existingIdx, 1);
    }

    freshRound.themeSubmissions.push(submission);
    return freshLeague;
  });

  if (!updatedLeague) {
    await interaction.editReply({
      content: 'The round state has changed. Please try again with `/submit-theme`.'
    });
    return;
  }

  console.log(`[Theme] Saved theme "${theme.trim()}" for user:${interaction.user.id} in round:${round.roundNumber}`);

  const updatedRound = getCurrentRound(updatedLeague)!;

  // Only send channel message when 1 player remains (holding up the stage)
  const submitterIds = new Set(updatedRound.themeSubmissions!.map(t => t.userId));
  const missingSubmitterIds = updatedLeague.participants.filter(id => !submitterIds.has(id));

  if (missingSubmitterIds.length === 1) {
    try {
      const channel = await interaction.client.channels.fetch(updatedLeague.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        // Fetch username for the remaining submitter
        const waitingUser = await interaction.client.users.fetch(missingSubmitterIds[0]);
        const waitingUsername = waitingUser?.username || 'Unknown User';

        await channel.send(
          `⏰ **Waiting on 1 player to submit their theme!**\n\n` +
          `${waitingUsername}, we're waiting for you!\n\n` +
          `Use \`/submit-theme\` to submit your theme idea.`
        );
      }
    } catch (error) {
      console.error('Failed to send final player notification:', error);
    }
  }

  // Send confirmation
  await interaction.editReply({
    content: `✅ Your theme has been ${isResubmission ? 'updated' : 'submitted'} for **${updatedLeague.name}**!\n\n` +
             `**"${theme.trim()}"**\n` +
             `${isResubmission ? '\n*Your previous theme has been replaced.*\n' : ''}` +
             `\nThemes submitted: ${updatedRound.themeSubmissions!.length}/${updatedLeague.participants.length}`
  });
}
