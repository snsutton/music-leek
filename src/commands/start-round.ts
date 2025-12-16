import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('start-round')
  .setDescription('Start a new round in the league')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueIdOption = interaction.options.get('league-id')?.value as string | undefined;

  const modal = new ModalBuilder()
    .setCustomId('start-round-modal')
    .setTitle('Start a New Round');

  const leagueIdInput = new TextInputBuilder()
    .setCustomId('league-id')
    .setLabel('League ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the league ID')
    .setRequired(true);

  if (leagueIdOption) {
    leagueIdInput.setValue(leagueIdOption);
  }

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('Round Prompt')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g., "Songs that make you feel nostalgic"')
    .setRequired(true);

  const submissionHoursInput = new TextInputBuilder()
    .setCustomId('submission-hours')
    .setLabel('Submission Hours (default: 72)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('72')
    .setValue('72')
    .setRequired(false);

  const votingHoursInput = new TextInputBuilder()
    .setCustomId('voting-hours')
    .setLabel('Voting Hours (default: 48)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('48')
    .setValue('48')
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(leagueIdInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(submissionHoursInput);
  const fourthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(votingHoursInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

  await interaction.showModal(modal);
}
