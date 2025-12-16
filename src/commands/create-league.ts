import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType } from 'discord.js';
import { Storage } from '../utils/storage';
import { League } from '../types';
import { generateId } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('create-league')
  .setDescription('Create a new Music League')
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

  const league: League = {
    id: generateId(),
    name,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    createdBy: interaction.user.id,
    createdAt: Date.now(),
    currentRound: 0,
    rounds: [],
    participants: [interaction.user.id]
  };

  Storage.saveLeague(league);

  await interaction.reply({
    content: `🎵 **${name}** has been created!\n\nLeague ID: \`${league.id}\`\nUse \`/join-league\` to join and \`/start-round\` to begin the first round!`,
    ephemeral: false
  });
}
