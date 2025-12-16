import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('end-round')
  .setDescription('End the current round and display results')
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

  if (league.createdBy !== interaction.user.id) {
    await interaction.reply({ content: 'Only the league creator can end rounds!', ephemeral: true });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', ephemeral: true });
    return;
  }

  if (round.status === 'completed') {
    await interaction.reply({ content: 'This round is already completed!', ephemeral: true });
    return;
  }

  if (round.status === 'submission') {
    await interaction.reply({ content: 'Start voting first with /start-voting!', ephemeral: true });
    return;
  }

  round.status = 'completed';
  Storage.saveLeague(league);

  // Calculate scores
  const scores = calculateScores(round);
  const sortedScores = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1]);

  // Create results embed
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🏆 Round ${round.roundNumber} Results`)
    .setDescription(`**Prompt:** ${round.prompt}\n\n**Final Standings:**\n`);

  let resultsText = '';
  sortedScores.forEach(([userId, score], index) => {
    const submission = round.submissions.find(s => s.userId === userId);
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    if (submission) {
      resultsText += `\n${medal} **${submission.songTitle}** by ${submission.artist}\n`;
      resultsText += `   Submitted by <@${userId}> - **${score} points**\n`;
      resultsText += `   ${submission.songUrl}\n`;
    }
  });

  embed.setDescription(embed.data.description + resultsText);
  embed.setFooter({ text: `Votes cast: ${round.votes.length}/${league.participants.length}` });

  await interaction.reply({
    content: `🎉 **Round ${round.roundNumber} has ended!**`,
    embeds: [embed],
    ephemeral: false
  });
}
