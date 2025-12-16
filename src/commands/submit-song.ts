import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('submit-song')
  .setDescription('Submit a song for the current round')
  .addStringOption(option =>
    option.setName('league-id')
      .setDescription('The league ID')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const leagueIdOption = interaction.options.get('league-id')?.value as string | undefined;

  const modal = new ModalBuilder()
    .setCustomId('submit-song-modal')
    .setTitle('Submit Your Song');

  const leagueIdInput = new TextInputBuilder()
    .setCustomId('league-id')
    .setLabel('League ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the league ID')
    .setRequired(true);

  if (leagueIdOption) {
    leagueIdInput.setValue(leagueIdOption);
  }

  const songUrlInput = new TextInputBuilder()
    .setCustomId('song-url')
    .setLabel('Song URL (Spotify/YouTube)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://open.spotify.com/track/...')
    .setRequired(true);

  const songTitleInput = new TextInputBuilder()
    .setCustomId('song-title')
    .setLabel('Song Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the song title')
    .setRequired(true);

  const artistInput = new TextInputBuilder()
    .setCustomId('artist')
    .setLabel('Artist Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the artist name')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(leagueIdInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(songUrlInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(songTitleInput);
  const fourthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(artistInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

  await interaction.showModal(modal);
}
