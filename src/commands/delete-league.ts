import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { isCreator } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('delete-league')
  .setDescription('Delete this server\'s league (creator only)')
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

  if (!isCreator(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only the league creator can delete the league!', ephemeral: true });
    return;
  }

  const leagueName = league.name;
  const success = Storage.deleteLeague(interaction.guildId);

  if (success) {
    await interaction.reply({
      content: `🗑️ League **${leagueName}** has been deleted.`,
      ephemeral: false
    });
  } else {
    await interaction.reply({
      content: 'Failed to delete the league. Please try again.',
      ephemeral: true
    });
  }
}
