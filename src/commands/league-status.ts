import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeagueStatus, getCurrentRound, getMissingSubmitters, getMissingVoters } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('league-status')
  .setDescription('Check the status of this server\'s league')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
    return;
  }

  let status = formatLeagueStatus(league);

  // Add participant tracking for current round
  const round = getCurrentRound(league);
  if (round) {
    let missingUserIds: string[] = [];
    let showWaiting = false;

    if (round.status === 'submission') {
      missingUserIds = getMissingSubmitters(league, round);
      // Only show if 50% or fewer are missing
      showWaiting = missingUserIds.length > 0 && missingUserIds.length <= league.participants.length / 2;
    } else if (round.status === 'voting') {
      missingUserIds = getMissingVoters(league, round);
      // Only show if 50% or fewer are missing
      showWaiting = missingUserIds.length > 0 && missingUserIds.length <= league.participants.length / 2;
    }

    if (showWaiting) {
      // Fetch usernames for missing participants
      const usernameResults = await Promise.allSettled(
        missingUserIds.map(id => interaction.client.users.fetch(id))
      );

      const missingUsernames = usernameResults.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value.username;
        }
        return 'Unknown User';
      });

      // Handle Discord's 2000 char limit
      const maxLength = 800; // Lower limit for status to keep message concise
      let usernameList = missingUsernames.join(', ');

      if (usernameList.length > maxLength) {
        // Truncate and show count
        const truncated = [];
        let currentLength = 0;

        for (const username of missingUsernames) {
          if (currentLength + username.length + 2 > maxLength) break;
          truncated.push(username);
          currentLength += username.length + 2;
        }

        const remaining = missingUsernames.length - truncated.length;
        usernameList = truncated.join(', ') + ` ... and ${remaining} more`;
      }

      status += `\n\n**Waiting for:** ${usernameList}`;
    }
  }

  await interaction.reply({
    content: status
  });
}
