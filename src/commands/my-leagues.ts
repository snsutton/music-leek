import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('my-leagues')
  .setDescription('List all leagues you are part of (works in DMs too!)');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  let leagues;

  if (interaction.guildId) {
    // In a server: show leagues in this server that the user is part of
    leagues = Storage.getLeaguesByGuild(interaction.guildId)
      .filter(league => league.participants.includes(userId));
  } else {
    // In DMs: show all leagues the user is part of
    leagues = Storage.getAllLeagues()
      .filter(league => league.participants.includes(userId));
  }

  if (leagues.length === 0) {
    const contextMsg = interaction.guildId
      ? 'You are not part of any leagues in this server!'
      : 'You are not part of any leagues!';
    await interaction.reply({ content: contextMsg, ephemeral: true });
    return;
  }

  let response = '🎵 **Your Music Leagues:**\n\n';
  leagues.forEach(league => {
    const round = getCurrentRound(league);
    const roundStatus = round
      ? `Round ${round.roundNumber} - ${round.status}`
      : 'No active round';

    response += `**${league.name}**\n`;
    response += `   ID: \`${league.id}\`\n`;
    response += `   Status: ${roundStatus}\n`;
    response += `   Participants: ${league.participants.length}\n`;
    response += `   Created by: <@${league.createdBy}>\n\n`;
  });

  response += '\n💡 **Tip:** You can use `/submit-song` and `/vote` commands in DMs by providing the league ID!';

  await interaction.reply({
    content: response,
    ephemeral: true
  });
}
