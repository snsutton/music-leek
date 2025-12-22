import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('start-voting')
  .setDescription('Start the voting phase (admin only)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', ephemeral: true });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only league admins can start voting!', ephemeral: true });
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
