import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeagueStatus } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('league-status')
  .setDescription('Check the status of this server\'s league')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
    return;
  }

  const status = formatLeagueStatus(league);

  await interaction.reply({
    content: status
  });
}
