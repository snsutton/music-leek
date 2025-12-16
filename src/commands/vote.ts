import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for songs in the current round')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueIdOption = interaction.options.get('league-id')?.value as string | undefined;

  const modal = new ModalBuilder()
    .setCustomId('vote-modal')
    .setTitle('Vote for Songs');

  const leagueIdInput = new TextInputBuilder()
    .setCustomId('league-id')
    .setLabel('League ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the league ID')
    .setRequired(true);

  if (leagueIdOption) {
    leagueIdInput.setValue(leagueIdOption);
  }

  // Build submission list if league ID is provided
  let submissionList = '';
  if (leagueIdOption) {
    const league = Storage.getLeague(leagueIdOption);
    if (league) {
      const round = getCurrentRound(league);
      if (round && round.submissions.length > 0) {
        submissionList = round.submissions
          .map((s, idx) => `${idx + 1}. ${s.songTitle} - ${s.artist}`)
          .join('\n');
      }
    }
  }

  const submissionsInfoInput = new TextInputBuilder()
    .setCustomId('submissions-info')
    .setLabel('Available Submissions')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(submissionList || 'Enter a league ID to see submissions')
    .setRequired(false);

  const votesInput = new TextInputBuilder()
    .setCustomId('votes')
    .setLabel('Your Votes (format: 1:5,2:4,3:3)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1:5,2:4,3:3 (submission#:points)')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(leagueIdInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(submissionsInfoInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(votesInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
}
