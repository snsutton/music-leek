import {
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { VoteSessionManager } from '../utils/vote-sessions';

export const customId = 'vote-song-select';

export async function execute(interaction: StringSelectMenuInteraction) {
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid interaction!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get the selected song index
  const submissionIndex = parseInt(interaction.values[0]);

  // Get session
  const session = VoteSessionManager.getSession(interaction.user.id, guildId);
  if (!session) {
    await interaction.reply({
      content: 'Your voting session has expired. Please run `/vote` again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);
  if (!league) {
    await interaction.reply({
      content: 'League not found!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const round = getCurrentRound(league);
  if (!round || round.status !== 'voting') {
    await interaction.reply({
      content: 'Voting is not currently open!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get the submission
  const submission = round.submissions[submissionIndex];
  if (!submission) {
    await interaction.reply({
      content: 'Song not found!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get current points for this song (if any)
  const currentPoints = session.pointAllocations.get(submissionIndex);

  // Build modal with single input
  const modal = new ModalBuilder()
    .setCustomId(`vote-points-modal:${guildId}:${submissionIndex}`)
    .setTitle('Assign Points');

  const input = new TextInputBuilder()
    .setCustomId('points')
    .setLabel(`${submission.songTitle}`.substring(0, 45))
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter points (0-10)')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  // Only set value if user has already assigned points to this song
  if (currentPoints !== undefined) {
    input.setValue(currentPoints.toString());
  }

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input)
  );

  await interaction.showModal(modal);
}
