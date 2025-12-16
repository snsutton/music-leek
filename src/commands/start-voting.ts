import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('start-voting')
  .setDescription('Start the voting phase (ends submission phase)')
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
    await interaction.reply({ content: 'Only the league creator can start voting!', ephemeral: true });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', ephemeral: true });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Voting has already started or round is complete!', ephemeral: true });
    return;
  }

  if (round.submissions.length === 0) {
    await interaction.reply({ content: 'No submissions yet!', ephemeral: true });
    return;
  }

  round.status = 'voting';
  Storage.saveLeague(league);

  // Create embed with all submissions
  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`🎵 Round ${round.roundNumber} - Voting Phase`)
    .setDescription(`**Prompt:** ${round.prompt}\n\n**Submissions:**\n`)
    .setFooter({ text: `Use /vote to cast your votes! Deadline: ${new Date(round.votingDeadline).toLocaleString()}` });

  let submissionList = '';
  round.submissions.forEach((sub, index) => {
    submissionList += `\n**${index + 1}.** ${sub.songTitle} - ${sub.artist}\n${sub.songUrl}\n`;
  });

  embed.setDescription(embed.data.description + submissionList);

  await interaction.reply({
    content: `🗳️ **Voting has started for Round ${round.roundNumber}!**\n\nReview the submissions and use \`/vote\` to rank your favorites!`,
    embeds: [embed],
    ephemeral: false
  });
}
