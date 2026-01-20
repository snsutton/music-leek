import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Storage } from '../utils/storage';
import { League } from '../types';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { SpotifyOAuthService } from '../services/spotify-oauth-service';
import { toISOString } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('create-league')
  .setDescription('Create a new music league for this server')
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Name of the league')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('total-rounds')
      .setDescription('Total number of rounds for this league')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(50)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.get('name')?.value as string;
  const totalRounds = interaction.options.get('total-rounds')?.value as number;

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Check if league already exists for this server
  const existingLeague = Storage.getLeagueByGuild(interaction.guildId);
  if (existingLeague) {
    await interaction.reply({
      content: `This server already has a league called **${existingLeague.name}**!\n\nUse \`/delete-league\` first if you want to create a new one.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league: League = {
    name,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    createdBy: interaction.user.id,
    admins: [interaction.user.id],
    createdAt: toISOString(),
    currentRound: 0,
    rounds: [],
    participants: [interaction.user.id],
    totalRounds,
    isCompleted: false
  };

  Storage.saveLeague(league);

  // Send DM notification to creator
  const embed = NotificationTemplates.leagueCreated(league);
  await NotificationService.sendDM(
    interaction.client,
    interaction.user.id,
    { embeds: [embed] },
    league.guildId,
    'league_created'
  );

  // Prompt user to connect Spotify
  try {
    const authUrl = SpotifyOAuthService.generateAuthUrl(interaction.user.id, interaction.guildId);

    const button = new ButtonBuilder()
      .setLabel('Connect Spotify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(authUrl);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await interaction.reply({
      content: `🎵 **${name}** has been created with ${totalRounds} rounds!\n\n` +
               `You've automatically joined as a participant and admin.\n\n` +
               `**Next Step:** Connect your Spotify account to enable automatic playlist creation for voting rounds.\n` +
               `Click the button below to authorize Music Leek:`,
      components: [row]
    });
  } catch (error) {
    console.error('[CreateLeague] Failed to generate Spotify auth URL:', error);

    // Fallback if Spotify OAuth isn't configured
    await interaction.reply({
      content: `🎵 **${name}** has been created with ${totalRounds} rounds!\n\n` +
               `You've automatically joined as a participant and admin.\n` +
               `Use \`/start-round\` to begin the first round!`
    });
  }
}
