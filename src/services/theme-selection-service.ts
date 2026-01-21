import { League, Round, ThemeSubmission } from '../types';

/**
 * Select a theme using weighted random selection and update ticket counts.
 *
 * The weighting system gives players who haven't been selected recently
 * a higher chance of being selected. Each player accumulates "tickets"
 * when they submit themes, and the selected player's tickets reset to 0.
 *
 * @param league - The league to update
 * @param round - The round containing theme submissions
 * @returns The selected theme submission, or null if no themes available
 */
export function selectThemeAndUpdateTickets(
  league: League,
  round: Round
): ThemeSubmission | null {
  if (!round.themeSubmissions || round.themeSubmissions.length === 0) {
    return null;
  }

  const tickets = league.themeSelectionTickets ?? {};

  // Calculate weights: ticket count + 1 (so 0 tickets = weight of 1)
  const weights = round.themeSubmissions.map(s => (tickets[s.userId] ?? 0) + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Weighted random selection
  let random = Math.random() * totalWeight;
  let selectedTheme = round.themeSubmissions[round.themeSubmissions.length - 1];
  for (let i = 0; i < round.themeSubmissions.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedTheme = round.themeSubmissions[i];
      break;
    }
  }

  // Update round prompt
  round.prompt = selectedTheme.theme;

  // Update tickets: increment all submitters, then reset selected to 0
  if (!league.themeSelectionTickets) {
    league.themeSelectionTickets = {};
  }
  for (const submission of round.themeSubmissions) {
    league.themeSelectionTickets[submission.userId] =
      (league.themeSelectionTickets[submission.userId] ?? 0) + 1;
  }
  league.themeSelectionTickets[selectedTheme.userId] = 0;

  return selectedTheme;
}
