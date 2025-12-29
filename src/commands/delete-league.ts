import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { isCreator } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('delete-league')
  .setDescription('Delete this server\'s league (creator only)')
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

  if (!isCreator(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only the league creator can delete the league!', flags: MessageFlags.Ephemeral });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`delete-league-modal:${interaction.guildId}`)
    .setTitle('⚠️ Confirm League Deletion');

  const confirmInput = new TextInputBuilder()
    .setCustomId('league-name-confirmation')
    .setLabel(`Type "${league.name}" to confirm deletion`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(league.name)
    .setRequired(true);

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}
