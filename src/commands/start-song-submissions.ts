import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { selectThemeAndUpdateTickets } from '../services/theme-selection-service';

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

  // Select theme using weighted random selection
  const selectedTheme = selectThemeAndUpdateTickets(league, round);

  if (selectedTheme) {

    // Send dual notifications (channel + DMs)
    const notification = NotificationTemplates.themeSelected(league, round, selectedTheme);
    await NotificationService.sendDualNotification(
      interaction.client,
      league.participants,
      { embeds: [notification.dm] },
      notification.channel,
      league.channelId,
      {
        guildId: league.guildId,
        notificationType: 'theme_selected',
        appendJoinBlurb: true
      }
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

    // Send dual notifications (channel + DMs)
    const notification = NotificationTemplates.themeSelectedFallback(league, round);
    await NotificationService.sendDualNotification(
      interaction.client,
      league.participants,
      { embeds: [notification.dm] },
      notification.channel,
      league.channelId,
      {
        guildId: league.guildId,
        notificationType: 'theme_selected',
        appendJoinBlurb: true
      }
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
