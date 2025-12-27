import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { League } from '../types';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';

export const data = new SlashCommandBuilder()
  .setName('create-league')
  .setDescription('Create a new music league for this server')
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Name of the league')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('total-rounds')
      .setDescription('Total number of rounds for this league')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(50)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.get('name')?.value as string;
  const totalRounds = interaction.options.get('total-rounds')?.value as number;

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Check if league already exists for this server
  const existingLeague = Storage.getLeagueByGuild(interaction.guildId);
  if (existingLeague) {
    await interaction.reply({
      content: `This server already has a league called **${existingLeague.name}**!\n\nUse \`/delete-league\` first if you want to create a new one.`,
      flags: MessageFlags.Ephemeral
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
    participants: [interaction.user.id],
    totalRounds,
    isCompleted: false
  };

  Storage.saveLeague(league);

  // Send DM notification to creator
  const embed = NotificationTemplates.leagueCreated(league);
  await NotificationService.sendDM(interaction.client, interaction.user.id, { embeds: [embed] });

  await interaction.reply({
    content: `🎵 **${name}** has been created with ${totalRounds} rounds!\n\nYou've automatically joined as a participant and admin.\nUse \`/start-round\` to begin the first round!`
  });
}
