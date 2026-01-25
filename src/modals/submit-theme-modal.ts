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

  // Initialize themeSubmissions array if it doesn't exist
  if (!round.themeSubmissions) {
    round.themeSubmissions = [];
  }

  // Find and remove existing submission if it exists (allows resubmission)
  const existingSubmissionIndex = round.themeSubmissions.findIndex(t => t.userId === interaction.user.id);
  const isResubmission = existingSubmissionIndex !== -1;

  if (isResubmission) {
    // Remove the old submission so the new one can replace it
    round.themeSubmissions.splice(existingSubmissionIndex, 1);
  }

  // Create theme submission
  const submission: ThemeSubmission = {
    userId: interaction.user.id,
    theme: theme.trim(),
    submittedAt: toISOString()
  };

  round.themeSubmissions.push(submission);
  Storage.saveLeague(league);

  // Only send channel message when 1 player remains (holding up the stage)
  const submitterIds = new Set(round.themeSubmissions.map(t => t.userId));
  const missingSubmitterIds = league.participants.filter(id => !submitterIds.has(id));

  if (missingSubmitterIds.length === 1) {
    try {
      const channel = await interaction.client.channels.fetch(league.channelId);
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
    content: `✅ Your theme has been ${isResubmission ? 'updated' : 'submitted'} for **${league.name}**!\n\n` +
             `**"${theme.trim()}"**\n` +
             `${isResubmission ? '\n*Your previous theme has been replaced.*\n' : ''}` +
             `\nThemes submitted: ${round.themeSubmissions.length}/${league.participants.length}`
  });
}
