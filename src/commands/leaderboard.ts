import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeaderboard } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Display the overall league leaderboard')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
    return;
  }

  const leaderboardText = formatLeaderboard(league);

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`📊 ${league.name}`)
    .setDescription(leaderboardText)
    .setFooter({ text: `Total rounds: ${league.rounds.filter(r => r.status === 'completed').length}` });

  await interaction.reply({
    embeds: [embed]
  });
}
