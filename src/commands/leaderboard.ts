import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeaderboard } from '../utils/helpers';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Display the overall league leaderboard')
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
    await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
    return;
  }

  const leaderboardText = formatLeaderboard(league);

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`📊 ${league.name}`)
    .setDescription(leaderboardText)
    .setFooter({ text: `Completed rounds: ${league.rounds.filter(r => r.status === 'completed').length} | Use /league-status for current round` });

  await interaction.reply({
    embeds: [embed]
  });
}
