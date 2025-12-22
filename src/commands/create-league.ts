import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { League } from '../types';

export const data = new SlashCommandBuilder()
  .setName('create-league')
  .setDescription('Create a new music league for this server')
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Name of the league')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.get('name')?.value as string;

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
    return;
  }

  // Check if league already exists for this server
  const existingLeague = Storage.getLeagueByGuild(interaction.guildId);
  if (existingLeague) {
    await interaction.reply({
      content: `This server already has a league called **${existingLeague.name}**!\n\nUse \`/delete-league\` first if you want to create a new one.`,
      ephemeral: true
    });
    return;
  }

  const league: League = {
    name,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    createdBy: interaction.user.id,
    admins: [interaction.user.id],
    createdAt: Date.now(),
    currentRound: 0,
    rounds: [],
    participants: [interaction.user.id]
  };

  Storage.saveLeague(league);

  await interaction.reply({
    content: `🎵 **${name}** has been created!\n\nYou've automatically joined as a participant and admin.\nUse \`/start-round\` to begin the first round!`,
    ephemeral: false
  });
}
