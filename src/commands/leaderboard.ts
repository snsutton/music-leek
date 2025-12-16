import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeaderboard } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Display the overall league leaderboard')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueId = interaction.options.get('league-id')?.value as string;

  const league = Storage.getLeague(leagueId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', ephemeral: true });
    return;
  }

  const leaderboardText = formatLeaderboard(league);

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`📊 ${league.name}`)
    .setDescription(leaderboardText)
    .setFooter({ text: `Total rounds: ${league.rounds.filter(r => r.status === 'completed').length}` });

  await interaction.reply({
    embeds: [embed],
    ephemeral: false
  });
}
