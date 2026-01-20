import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, toTimestamp } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { VotingService } from '../services/voting-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('start-voting')
  .setDescription('End song submission phase and start voting early (admin only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
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
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only league admins can start voting!', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Voting has already started or round is complete!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.submissions.length === 0) {
    await interaction.reply({ content: 'No submissions yet!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Start voting using shared service (skip channel post since we'll show detailed embed)
  try {
    await VotingService.startVoting(interaction.client, league, round, {
      logPrefix: 'StartVoting',
      skipChannelPost: true
    });
  } catch (error) {
    await interaction.reply({
      content: '❌ Failed to start voting. Please try again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Reload league to get updated round data
  const updatedLeague = Storage.getLeagueByGuild(guildId)!;
  const updatedRound = getCurrentRound(updatedLeague)!;

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`🎵 Round ${updatedRound.roundNumber} - Voting Phase`)
    .setDescription(
      `**Prompt:** ${updatedRound.prompt}\n\n` +
      (updatedRound.playlist
        ? `🎧 **[Listen to all submissions with this Spotify playlist](${updatedRound.playlist.playlistUrl})**\n\n`
        : ''
      ) +
      `**Submissions:**\n`
    )
    .setFooter({ text: `Use /vote to cast your votes! Deadline: ${new Date(toTimestamp(updatedRound.votingDeadline)).toLocaleString()}` });

  let submissionList = '';
  updatedRound.submissions.forEach((sub, index) => {
    submissionList += `\n**${index + 1}.** ${sub.songTitle} - ${sub.artist}\n${sub.songUrl}\n`;
  });

  embed.setDescription(embed.data.description + submissionList);

  await interaction.reply({
    content: `🗳️ **Voting has started for Round ${updatedRound.roundNumber}!**\n\n` +
             `Review the submissions and use \`/vote\` to rank your favorites!\n\n` +
             `Notifications sent to ${updatedLeague.participants.length} participants.`,
    embeds: [embed]
  });
}
