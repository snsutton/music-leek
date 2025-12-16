import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';

export const data = new SlashCommandBuilder()
  .setName('join-league')
  .setDescription('Join an existing Music League')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID to join')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueId = interaction.options.get('league-id')?.value as string;

  const league = Storage.getLeague(leagueId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', ephemeral: true });
    return;
  }

  if (league.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'This league is in a different server!', ephemeral: true });
    return;
  }

  if (league.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are already in this league!', ephemeral: true });
    return;
  }

  league.participants.push(interaction.user.id);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `🎵 <@${interaction.user.id}> joined **${league.name}**!\n\nTotal participants: ${league.participants.length}`,
    ephemeral: false
  });
}
