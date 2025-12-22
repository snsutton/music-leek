import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';

export const data = new SlashCommandBuilder()
  .setName('submit-song')
  .setDescription('Submit a song for the current round (opens DM)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  // This command can be used in server or DM, but we need a guildId
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'Please run this command from the server where the league is hosted!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if league exists
  const league = Storage.getLeagueByGuild(guildId);
  if (!league) {
    await interaction.reply({
      content: 'No league found for this server!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user is a participant
  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'You are not in this league! Use `/join-league` first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`submit-song-modal:${guildId}`)
    .setTitle(`Submit to ${league.name}`);

  const songUrlInput = new TextInputBuilder()
    .setCustomId('song-url')
    .setLabel('Song URL (Spotify/Apple Music)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://open.spotify.com/track/... or https://music.apple.com/...')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(songUrlInput);

  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}
