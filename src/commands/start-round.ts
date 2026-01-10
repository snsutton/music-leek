import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { DEFAULT_SUBMISSION_DAYS, DEFAULT_VOTING_DAYS } from '../constants';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('start-round')
  .setDescription('Start a new round in the league (admin only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Resolve guild context (server or DM)
  const { guildId } = resolveGuildContext(interaction);

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command requires league context.\n\n' +
               'Please run this command from the server where your league is hosted, ' +
               'or wait for a notification from your league.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`start-round-modal:${guildId}`)
    .setTitle('Start a New Round');

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('Your Theme Submission')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g., "Songs that make you feel nostalgic"')
    .setRequired(true);

  const submissionDaysInput = new TextInputBuilder()
    .setCustomId('submission-days')
    .setLabel(`Song Submission Days (default: ${DEFAULT_SUBMISSION_DAYS})`)
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
