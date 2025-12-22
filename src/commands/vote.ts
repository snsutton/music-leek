import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for songs in the current round')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server!',
      ephemeral: true
    });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);
  if (!league) {
    await interaction.reply({
      content: 'No league found for this server!',
      ephemeral: true
    });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'You are not in this league! Use `/join-league` first.',
      ephemeral: true
    });
    return;
  }

  const round = getCurrentRound(league);
  if (!round) {
    await interaction.reply({
      content: 'No active round!',
      ephemeral: true
    });
    return;
  }

  if (round.status !== 'voting') {
    await interaction.reply({
      content: 'Voting is not open yet!',
      ephemeral: true
    });
    return;
  }

  // Build submission list
  const submissionList = round.submissions
    .map((s, idx) => `${idx + 1}. ${s.songTitle} - ${s.artist}`)
    .join('\n');

  const modal = new ModalBuilder()
    .setCustomId(`vote-modal:${interaction.guildId}`)
    .setTitle(`Vote - ${league.name}`);

  const submissionsInfoInput = new TextInputBuilder()
    .setCustomId('submissions-info')
    .setLabel('Available Submissions')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(submissionList)
    .setRequired(false);

  const votesInput = new TextInputBuilder()
    .setCustomId('votes')
    .setLabel('Your Votes (format: 1:5,2:4,3:3)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1:5,2:4,3:3 (submission#:points)')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(submissionsInfoInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(votesInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}
