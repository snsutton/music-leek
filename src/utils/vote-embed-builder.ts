import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { Round } from '../types';
import { VoteSession } from './vote-sessions';
import { POINTS_BUDGET } from '../constants';

/**
 * Build the voting hub embed showing all songs and current point allocations
 */
export function buildVotingHubEmbed(
  round: Round,
  session: VoteSession,
  budget: number = POINTS_BUDGET
): EmbedBuilder {
  const totalUsed = [...session.pointAllocations.values()].reduce((a, b) => a + b, 0);
  const remaining = budget - totalUsed;

  let description = '**Songs (playlist order):**\n';

  // Track display number (only counting votable songs)
  let displayNum = 1;
  for (const subIndex of session.displayOrder) {
    // Skip if not votable (user's own song)
    if (!session.votableSongIndices.includes(subIndex)) continue;

    const submission = round.submissions[subIndex];
    if (!submission) continue;

    const points = session.pointAllocations.get(subIndex);
    const pointsStr = points !== undefined && points > 0 ? `${points} pts` : '-';

    // Truncate song title if needed
    const title = submission.songTitle.length > 35
      ? submission.songTitle.substring(0, 32) + '...'
      : submission.songTitle;

    description += `\`${displayNum.toString().padStart(2, ' ')}.\` ${title} — **${pointsStr}**\n`;
    displayNum++;
  }

  // Budget status
  let budgetStatus = `\n**Points remaining: ${remaining}/${budget}**`;
  if (remaining === 0) {
    budgetStatus += ' ✅';
  } else if (remaining < 0) {
    budgetStatus += ' ⚠️ Over budget!';
  }

  description += budgetStatus;

  // Add playlist link if available
  if (round.playlist?.playlistUrl) {
    description += `\n\n🎧 [Listen on Spotify](${round.playlist.playlistUrl})`;
  }

  const embedColor = remaining < 0 ? 0xFF0000 : (remaining === 0 ? 0x00FF00 : 0x5865F2);

  return new EmbedBuilder()
    .setTitle(`🎵 Vote for Round ${round.roundNumber}`)
    .setDescription(description)
    .setColor(embedColor)
    .setFooter({ text: 'Select a song from the dropdown to assign points' });
}

/**
 * Build the voting hub components (select menu + submit button)
 */
export function buildVotingHubComponents(
  guildId: string,
  round: Round,
  displayOrder: number[],
  votableIndices: number[],
  allocations: Map<number, number>
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  // Build select menu options for each votable song
  const options: StringSelectMenuOptionBuilder[] = [];

  let displayNum = 1;
  for (const subIndex of displayOrder) {
    // Skip if not votable
    if (!votableIndices.includes(subIndex)) continue;

    const submission = round.submissions[subIndex];
    if (!submission) continue;

    const points = allocations.get(subIndex);
    const pointsStr = points ? `${points} pts assigned` : 'No points assigned';

    // Truncate title for label (max 100 chars)
    const label = `${displayNum}. ${submission.songTitle}`.substring(0, 100);

    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(subIndex.toString())
        .setDescription(pointsStr)
    );

    displayNum++;
  }

  // Row 1: Song select menu
  if (options.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`vote-song-select:${guildId}`)
      .setPlaceholder('Select a song to edit points...')
      .addOptions(options);

    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
  }

  // Row 2: Submit button
  const submitButton = new ButtonBuilder()
    .setCustomId(`vote-submit:${guildId}`)
    .setLabel('Submit Vote')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('✅');

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton));

  return rows;
}
