import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { Storage } from '../utils/storage';
import { isAdmin } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('set-channel')
  .setDescription('Set the channel where league announcements and results will be posted')
  .setDMPermission(false)
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('The channel to use for league announcements')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Get the league
  const league = Storage.getLeagueByGuild(interaction.guildId);
  if (!league) {
    await interaction.reply({
      content: 'No league found for this server! Create one with `/create-league` first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user is an admin
  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({
      content: 'Only league admins can change the announcement channel!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get the new channel
  const newChannel = interaction.options.getChannel('channel', true);

  if (!newChannel || newChannel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: 'Please select a valid text channel!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const oldChannelId = league.channelId;

  // Update the channel
  league.channelId = newChannel.id;
  Storage.saveLeague(league);

  await interaction.reply({
    content: `✓ League announcement channel updated!\n\nAll future round announcements and results for **${league.name}** will now be posted in <#${newChannel.id}>.`,
    flags: MessageFlags.Ephemeral
  });

  // Log the change
  console.log(`[SetChannel] Channel updated for league "${league.name}" (${league.guildId})`);
  console.log(`  Old channel: ${oldChannelId}`);
  console.log(`  New channel: ${newChannel.id}`);
  console.log(`  Updated by: ${interaction.user.id} (${interaction.user.tag})`);
}
