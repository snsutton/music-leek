import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';

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

  const scores = calculateScores(round);
  const sortedScores = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1]);

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
    embeds: [embed]
  });
}
