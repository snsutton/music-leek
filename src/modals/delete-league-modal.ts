import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { isCreator } from '../utils/permissions';

export const customId = 'delete-league-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const userInput = interaction.fields.getTextInputValue('league-name-confirmation');

  // Extract guildId from customId (pattern: delete-league-modal:{guildId})
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid deletion request! Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({
      content: 'League not found! It may have already been deleted.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Re-check permissions (user could have lost creator status)
  if (!isCreator(league, interaction.user.id)) {
    await interaction.reply({
      content: 'Only the league creator can delete the league!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // CRITICAL: Validate exact match (case-sensitive)
  if (userInput !== league.name) {
    await interaction.reply({
      content: `❌ Deletion cancelled. The name you entered does not match.\n\n` +
               `Expected: \`${league.name}\`\n` +
               `You entered: \`${userInput}\`\n\n` +
               `League name is case-sensitive.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Perform deletion
  const leagueName = league.name;
  const success = Storage.deleteLeague(guildId);

  if (success) {
    await interaction.reply({
      content: `🗑️ League **${leagueName}** has been permanently deleted.`
    });
  } else {
    await interaction.reply({
      content: 'Failed to delete the league. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}
