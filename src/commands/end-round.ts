import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores, calculateLeagueResults, calculateLeagueStandings, toISOString } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { resolveGuildContext } from '../utils/dm-context';
import { resolveUsernames } from '../utils/username-resolver';

export const data = new SlashCommandBuilder()
  .setName('end-round')
  .setDescription('End the current round and display results (admin only)')
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
    await interaction.reply({ content: 'Only league admins can end rounds!', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status === 'completed') {
    await interaction.reply({ content: 'This round is already completed!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status === 'submission') {
    await interaction.reply({ content: 'Start voting first with /start-voting!', flags: MessageFlags.Ephemeral });
    return;
  }

  round.status = 'completed';
  Storage.saveLeague(league);

  // Calculate current league standings
  const leagueStandings = calculateLeagueStandings(league);

  // Check if this is the last round
  const isLastRound = league.currentRound >= league.totalRounds;

  // Get the league channel
  const channel = await interaction.client.channels.fetch(league.channelId);

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.reply({
      content: 'Could not find league channel!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Collect all user IDs for username resolution
  const userIds: string[] = [
    ...Array.from(leagueStandings.keys()),
    ...round.submissions.map(s => s.userId)
  ];

  // Resolve usernames in batch
  const usernameCache = await resolveUsernames(interaction.client, userIds);

  if (isLastRound) {
    // Mark league as completed
    league.isCompleted = true;
    league.completedAt = toISOString();
    Storage.saveLeague(league);

    // Calculate league-wide results
    const results = calculateLeagueResults(league);

    // Post final round results + league fanfare to channel (with join-league blurb)
    const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, round, results, usernameCache);
    const messageContent = typeof fanfareMessage.content === 'string'
      ? fanfareMessage.content + NotificationTemplates.getJoinLeagueBlurb()
      : fanfareMessage.content;

    await channel.send({
      content: messageContent,
      embeds: fanfareMessage.embeds
    });

    await interaction.reply({
      content: `🎉 **Round ${round.roundNumber} has ended!**\n\n🏆 **${league.name} has concluded!** Check the channel for final results.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    // Post round results + leaderboard to channel (with join-league blurb)
    const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings, usernameCache);
    const messageContent = typeof roundMessage.content === 'string'
      ? roundMessage.content + NotificationTemplates.getJoinLeagueBlurb()
      : roundMessage.content;

    await channel.send({
      content: messageContent,
      embeds: roundMessage.embeds
    });

    // Notify admins that next round can start
    const adminEmbed = NotificationTemplates.roundReadyToStart(league);
    await NotificationService.sendBulkDM(
      interaction.client,
      league.admins,
      { embeds: [adminEmbed] },
      100,
      league.guildId,
      'round_ready_to_start'
    );

    await interaction.reply({
      content: `🎉 **Round ${round.roundNumber} has ended!** Results posted to the channel.\n\nAdmins have been notified that Round ${league.currentRound + 1} can begin.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
