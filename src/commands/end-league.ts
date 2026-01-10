import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateLeagueResults, calculateScores } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationTemplates } from '../services/notification-templates';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('end-league')
  .setDescription('End the league and award winners (preserves all data for /leaderboard)')
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
    await interaction.reply({ content: 'Only league admins can end the league!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (league.isCompleted) {
    await interaction.reply({ content: 'This league has already ended!', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  // If there's an active round, it must be completed first
  if (round && round.status !== 'completed') {
    await interaction.reply({
      content: `You must end the current round first with \`/end-round\` before ending the league!\n\n` +
               `Current round status: **${round.status === 'submission' ? 'Submission Phase' : 'Voting Phase'}**`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if at least one round has been completed
  const completedRounds = league.rounds.filter(r => r.status === 'completed');
  if (completedRounds.length === 0) {
    await interaction.reply({
      content: 'Cannot end league - no rounds have been completed yet!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Mark league as completed
  league.isCompleted = true;
  league.completedAt = Date.now();
  Storage.saveLeague(league);

  // Calculate league-wide results
  const results = calculateLeagueResults(league);

  // Get the league channel
  const channel = await interaction.client.channels.fetch(league.channelId);

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.reply({
      content: 'Could not find league channel!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // If the last round exists, use it for the fanfare message
  const lastRound = league.rounds[league.rounds.length - 1];

  if (lastRound && lastRound.status === 'completed') {
    // Post league ended fanfare with final round results
    const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, lastRound, results);
    await channel.send(fanfareMessage);
  } else {
    // Post league ended fanfare without round results
    const fanfareMessage = NotificationTemplates.leagueEndedEarlyWithFanfare(league, results);
    await channel.send(fanfareMessage);
  }

  await interaction.reply({
    content: `🏆 **${league.name} has been ended!**\n\n` +
             `League completed after ${completedRounds.length} round${completedRounds.length === 1 ? '' : 's'}.\n` +
             `Final results posted to the channel.\n\n` +
             `💾 **Note:** All league data is preserved. Use \`/leaderboard\` to view standings anytime.\n` +
             `To completely remove the league, use \`/delete-league\`.`,
    flags: MessageFlags.Ephemeral
  });
}
