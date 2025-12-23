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

export const customId = 'vote-select';

export async function execute(interaction: StringSelectMenuInteraction) {
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({
      content: 'Invalid interaction!',
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

  // Parse selected indices
  const selectedIndices = interaction.values.map(v => parseInt(v));

  // Store in session
  VoteSessionManager.createSession(
    interaction.user.id,
    guildId,
    selectedIndices
  );

  // Build modal with max 5 inputs (Discord limit)
  const modal = new ModalBuilder()
    .setCustomId(`vote-points-modal:${guildId}`)
    .setTitle('Assign Points (Budget: 10)');

  const rows: ActionRowBuilder<TextInputBuilder>[] = [];

  for (const index of selectedIndices.slice(0, 5)) {
    const submission = round.submissions[index];

    const input = new TextInputBuilder()
      .setCustomId(`points-${index}`)
      .setLabel(`${submission.songTitle}`.substring(0, 45))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('0-10')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  modal.addComponents(...rows);

  await interaction.showModal(modal);
}
