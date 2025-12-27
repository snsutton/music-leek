import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores, calculateLeagueResults, calculateLeagueStandings } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';

export const data = new SlashCommandBuilder()
  .setName('end-round')
  .setDescription('End the current round and display results (admin only)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

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

  if (isLastRound) {
    // Mark league as completed
    league.isCompleted = true;
    league.completedAt = Date.now();
    Storage.saveLeague(league);

    // Calculate league-wide results
    const results = calculateLeagueResults(league);

    // Post final round results + league fanfare to channel
    const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, round, results);
    await channel.send(fanfareMessage);

    await interaction.reply({
      content: `🎉 **Round ${round.roundNumber} has ended!**\n\n🏆 **${league.name} has concluded!** Check the channel for final results.`,
      flags: MessageFlags.Ephemeral
    });
  } else {
    // Post round results + leaderboard to channel
    const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings);
    await channel.send(roundMessage);

    // Notify admins that next round can start
    const adminEmbed = NotificationTemplates.roundReadyToStart(league);
    await NotificationService.sendBulkDM(
      interaction.client,
      league.admins,
      { embeds: [adminEmbed] }
    );

    await interaction.reply({
      content: `🎉 **Round ${round.roundNumber} has ended!** Results posted to the channel.\n\nAdmins have been notified that Round ${league.currentRound + 1} can begin.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
