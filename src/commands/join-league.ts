import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { canAddParticipant, MAX_PARTICIPANTS } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('join-league')
  .setDescription('Join this server\'s music league')
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

  if (league.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are already in this league!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!canAddParticipant(league)) {
    await interaction.reply({
      content: `This league is full! Maximum capacity is ${MAX_PARTICIPANTS} participants.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  league.participants.push(interaction.user.id);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `🎵 <@${interaction.user.id}> joined **${league.name}**!\n\nTotal participants: ${league.participants.length}`
  });
}
