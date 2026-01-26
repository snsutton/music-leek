import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { resolveGuildContext } from '../utils/dm-context';
import { VoteSessionManager } from '../utils/vote-sessions';
import { buildVotingHubEmbed, buildVotingHubComponents } from '../utils/vote-embed-builder';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for songs in the current round')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Resolve guild context (server or DM)
    const { guildId } = resolveGuildContext(interaction);

    if (!guildId) {
      await interaction.reply({
        content: '❌ This command requires league context.\n\n' +
                 'Please run this command from the server where your league is hosted, ' +
                 'or wait for a notification from your league.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const league = Storage.getLeagueByGuild(guildId);
    if (!league) {
      await interaction.reply({
        content: 'No league found for this server!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!league.participants.includes(interaction.user.id)) {
      await interaction.reply({
        content: 'You are not in this league! Use `/join-league` first.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const round = getCurrentRound(league);
    if (!round) {
      await interaction.reply({
        content: 'No active round!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (round.status !== 'voting') {
      await interaction.reply({
        content: 'Voting is not open yet!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if user submitted a song
    const userSubmitted = round.submissions.some(s => s.userId === interaction.user.id);
    if (!userSubmitted) {
      await interaction.reply({
        content: 'You must submit a song to vote! Only players who submitted are eligible to vote.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if >25 submissions (Discord select menu limit)
    if (round.submissions.length > 25) {
      await interaction.reply({
        content: '⚠️ This round has more than 25 submissions.\n\n' +
                 'The interactive voting UI supports up to 25 songs. ' +
                 'Please contact an admin to split this into multiple rounds.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Get votable song indices (exclude user's own submission)
    const votableSongIndices = round.submissions
      .map((s, idx) => ({ submission: s, index: idx }))
      .filter(item => item.submission.userId !== interaction.user.id)
      .map(item => item.index);

    if (votableSongIndices.length === 0) {
      await interaction.reply({
        content: 'No other submissions to vote for!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Determine display order: use shuffled playlist order if available, otherwise submission order
    const displayOrder = round.shuffledOrder && round.shuffledOrder.length > 0
      ? round.shuffledOrder
      : round.submissions.map((_, idx) => idx);

    // Check if user already has an active session (resuming vote)
    const existingSession = VoteSessionManager.getSession(interaction.user.id, guildId);

    // Send the voting hub message
    const message = await interaction.reply({
      content: `**🗳️ Vote for Round ${round.roundNumber} — "${round.prompt}"**`,
      embeds: [buildVotingHubEmbed(round, {
        userId: interaction.user.id,
        guildId,
        messageId: '', // Will be set after message is sent
        channelId: interaction.channelId || '',
        votableSongIndices,
        displayOrder,
        pointAllocations: existingSession?.pointAllocations || new Map(),
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000
      })],
      components: buildVotingHubComponents(
        guildId,
        round,
        displayOrder,
        votableSongIndices,
        existingSession?.pointAllocations || new Map()
      ),
      flags: MessageFlags.Ephemeral,
      fetchReply: true
    });

    // Create or update session with message ID
    VoteSessionManager.createSession(
      interaction.user.id,
      guildId,
      message.id,
      interaction.channelId || '',
      votableSongIndices,
      displayOrder
    );

    // If resuming, restore point allocations
    if (existingSession) {
      const session = VoteSessionManager.getSession(interaction.user.id, guildId);
      if (session) {
        for (const [index, points] of existingSession.pointAllocations) {
          session.pointAllocations.set(index, points);
        }
      }
    }
  } catch (error) {
    console.error('[Vote] Error executing vote command:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred while loading the voting interface. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred while loading the voting interface. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch {
      // Ignore reply errors
    }
  }
}
