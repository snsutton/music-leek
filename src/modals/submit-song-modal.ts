import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Submission } from '../types';
import { getCurrentRound } from '../utils/helpers';

export const customId = 'submit-song-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const songUrl = interaction.fields.getTextInputValue('song-url');
  const songTitle = interaction.fields.getTextInputValue('song-title');
  const artist = interaction.fields.getTextInputValue('artist');

  // Extract guildId from customId (format: "submit-song-modal:guildId")
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.reply({ content: 'Invalid submission! Please try again.', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are not in this league! Use `/join-league` first.', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Submission phase has ended!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (Date.now() > round.submissionDeadline) {
    await interaction.reply({ content: 'Submission deadline has passed!', flags: MessageFlags.Ephemeral });
    return;
  }

  const existingSubmission = round.submissions.find(s => s.userId === interaction.user.id);
  if (existingSubmission) {
    await interaction.reply({ content: 'You have already submitted a song for this round!', flags: MessageFlags.Ephemeral });
    return;
  }

  const submission: Submission = {
    userId: interaction.user.id,
    songUrl,
    songTitle,
    artist,
    submittedAt: Date.now()
  };

  round.submissions.push(submission);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `✅ Your submission has been recorded for **${league.name}**!\n**${songTitle}** by **${artist}**\n\nSubmissions: ${round.submissions.length}/${league.participants.length}`,
    flags: MessageFlags.Ephemeral
  });
}
