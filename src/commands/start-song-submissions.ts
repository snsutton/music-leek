import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';

export const data = new SlashCommandBuilder()
  .setName('start-song-submissions')
  .setDescription('End theme submission phase and start song submissions early (admin only)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({
      content: 'No league found for this server!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({
      content: 'Only league admins can use this command!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({
      content: 'No active round!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (round.status !== 'theme-submission') {
    await interaction.reply({
      content: 'The round is not in the theme submission phase!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Defer reply since we'll be doing async operations
  await interaction.deferReply();

  // Select theme
  if (round.themeSubmissions && round.themeSubmissions.length > 0) {
    // Random selection from submitted themes
    const randomIndex = Math.floor(Math.random() * round.themeSubmissions.length);
    const selectedTheme = round.themeSubmissions[randomIndex];
    round.prompt = selectedTheme.theme;

    // Post to channel
    try {
      const channel = await interaction.client.channels.fetch(league.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        await channel.send(
          `🎲 **Theme selected for Round ${round.roundNumber}!**\n\n` +
          `**"${selectedTheme.theme}"**\n\n` +
          `Submitted by <@${selectedTheme.userId}>\n\n` +
          `Get ready to submit your songs! Deadline: <t:${Math.floor(round.submissionDeadline / 1000)}:F>`
        );
      }
    } catch (error) {
      console.error('[StartSongSubmissions] Error posting theme selection to channel:', error);
    }

    // Send DM notifications
    const embed = NotificationTemplates.themeSelected(league, round, selectedTheme);
    await NotificationService.sendBulkDM(
      interaction.client,
      league.participants,
      { embeds: [embed] },
      100,
      league.guildId,
      'theme_selected'
    );

    // Transition to submission phase
    round.status = 'submission';
    round.notificationsSent.themeSelected = true;
    Storage.saveLeague(league);

    await interaction.editReply({
      content: `✅ Theme selected: **"${selectedTheme.theme}"**\n\n` +
               `Submitted by <@${selectedTheme.userId}>\n\n` +
               `Round has transitioned to song submission phase. Participants have been notified.`
    });
  } else {
    // No themes submitted - use admin's original prompt as fallback
    round.prompt = round.adminPrompt || 'No theme provided';

    // Post to channel
    try {
      const channel = await interaction.client.channels.fetch(league.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        await channel.send(
          `⚠️ **No additional themes were submitted!**\n\n` +
          `Using the original theme:\n**"${round.prompt}"**\n\n` +
          `Get ready to submit your songs! Deadline: <t:${Math.floor(round.submissionDeadline / 1000)}:F>`
        );
      }
    } catch (error) {
      console.error('[StartSongSubmissions] Error posting theme fallback to channel:', error);
    }

    // Send DM notifications
    const embed = NotificationTemplates.themeSelectedFallback(league, round);
    await NotificationService.sendBulkDM(
      interaction.client,
      league.participants,
      { embeds: [embed] },
      100,
      league.guildId,
      'theme_selected'
    );

    // Transition to submission phase
    round.status = 'submission';
    round.notificationsSent.themeSelected = true;
    Storage.saveLeague(league);

    await interaction.editReply({
      content: `✅ Using original theme: **"${round.prompt}"**\n\n` +
               `Round has transitioned to song submission phase. Participants have been notified.`
    });
  }
}
