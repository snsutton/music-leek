import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { DEFAULT_SUBMISSION_DAYS, DEFAULT_VOTING_DAYS } from '../constants';

export const data = new SlashCommandBuilder()
  .setName('start-round')
  .setDescription('Start a new round in the league (admin only)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('start-round-modal')
    .setTitle('Start a New Round');

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('Round Prompt')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g., "Songs that make you feel nostalgic"')
    .setRequired(true);

  const submissionDaysInput = new TextInputBuilder()
    .setCustomId('submission-days')
    .setLabel(`Submission Days (default: ${DEFAULT_SUBMISSION_DAYS})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(String(DEFAULT_SUBMISSION_DAYS))
    .setValue(String(DEFAULT_SUBMISSION_DAYS))
    .setRequired(false);

  const votingDaysInput = new TextInputBuilder()
    .setCustomId('voting-days')
    .setLabel(`Voting Days (default: ${DEFAULT_VOTING_DAYS})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(String(DEFAULT_VOTING_DAYS))
    .setValue(String(DEFAULT_VOTING_DAYS))
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(submissionDaysInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(votingDaysInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
}
