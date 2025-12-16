import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeagueStatus } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('league-status')
  .setDescription('Check the status of a league')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueId = interaction.options.get('league-id')?.value as string;

  const league = Storage.getLeague(leagueId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', ephemeral: true });
    return;
  }

  const status = formatLeagueStatus(league);

  await interaction.reply({
    content: status,
    ephemeral: false
  });
}
