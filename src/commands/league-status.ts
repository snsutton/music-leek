import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { formatLeagueStatus, getCurrentRound, getMissingSubmitters, getMissingVoters } from '../utils/helpers';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('league-status')
  .setDescription('Check the status of this server\'s league')
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
      await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = formatLeagueStatus(league);

    // Add participant tracking for current round
    const round = getCurrentRound(league);
    if (round) {
      let missingUserIds: string[] = [];

      if (round.status === 'submission') {
        missingUserIds = getMissingSubmitters(league, round);
      } else if (round.status === 'voting') {
        missingUserIds = getMissingVoters(league, round);
      }

      // Only show if 50% or fewer are missing
      if (missingUserIds.length > 0 && missingUserIds.length <= league.participants.length / 2) {
        const mentionList = missingUserIds.map(id => `<@${id}>`).join(', ');
        embed.addFields({ name: '⏳ Waiting for', value: mentionList });
      }
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[LeagueStatus] Error executing league-status command:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error checking the league status.', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error checking the league status.', flags: MessageFlags.Ephemeral });
      }
    } catch {
      // Ignore
    }
  }
}
