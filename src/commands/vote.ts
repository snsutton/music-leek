import { ChatInputCommandInteraction, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for songs in the current round')
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

  // Filter out user's own submission
  const votableSubmissions = round.submissions
    .map((s, idx) => ({ submission: s, index: idx }))
    .filter(item => item.submission.userId !== interaction.user.id);

  if (votableSubmissions.length === 0) {
    await interaction.reply({
      content: 'No other submissions to vote for!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Build select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`vote-select:${guildId}`)
    .setPlaceholder('Select songs to vote for...')
    .setMinValues(1)
    .setMaxValues(Math.min(votableSubmissions.length, 10))
    .addOptions(
      votableSubmissions.map(item => ({
        label: `${item.index + 1}. ${item.submission.songTitle}`.substring(0, 100),
        description: item.submission.artist.substring(0, 100),
        value: item.index.toString()
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selectMenu);

  await interaction.reply({
    content: `**🗳️ Vote for Round ${round.roundNumber}**\n\n` +
             `You have **10 points** to distribute across songs.\n` +
             `Select up to ${Math.min(votableSubmissions.length, 10)} songs, then assign points.`,
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}
