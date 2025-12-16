import { ModalSubmitInteraction } from 'discord.js';
import { Storage } from '../utils/storage';
import { Submission } from '../types';
import { getCurrentRound } from '../utils/helpers';

export const customId = 'submit-song-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const leagueId = interaction.fields.getTextInputValue('league-id');
  const songUrl = interaction.fields.getTextInputValue('song-url');
  const songTitle = interaction.fields.getTextInputValue('song-title');
  const artist = interaction.fields.getTextInputValue('artist');

  const league = Storage.getLeague(leagueId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', ephemeral: true });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are not in this league!', ephemeral: true });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', ephemeral: true });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Submission phase has ended!', ephemeral: true });
    return;
  }

  if (Date.now() > round.submissionDeadline) {
    await interaction.reply({ content: 'Submission deadline has passed!', ephemeral: true });
    return;
  }

  const existingSubmission = round.submissions.find(s => s.userId === interaction.user.id);
  if (existingSubmission) {
    await interaction.reply({ content: 'You have already submitted a song! Use the update submission modal to change it.', ephemeral: true });
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
    content: `✅ Your submission has been recorded!\n**${songTitle}** by **${artist}**\n\nSubmissions: ${round.submissions.length}/${league.participants.length}`,
    ephemeral: true
  });
}
