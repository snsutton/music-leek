import axios from 'axios';
import { parseMusicUrl, resolveSpotifyShortLink } from '../../utils/url-validator';

jest.mock('axios');

describe('parseMusicUrl', () => {
  const trackId = '7CI5IAi2z70tyJIVXxsHfw';

  it.each([
    `https://open.spotify.com/track/${trackId}`,
    `https://open.spotify.com/track/${trackId}?si=abc123`,
    `https://open.spotify.com/intl-de/track/${trackId}`,
    `https://open.spotify.com/intl-pt-br/track/${trackId}?si=abc123`,
    `spotify:track:${trackId}`
  ])('extracts the track ID from %s', (url) => {
    expect(parseMusicUrl(url)).toEqual({ platform: 'spotify', trackId, originalUrl: url });
  });

  it.each([
    `https://open.spotify.com/album/${trackId}`,
    `https://open.spotify.com/intl-de/playlist/${trackId}`,
    'https://example.com/track/abc'
  ])('rejects %s', (url) => {
    expect(parseMusicUrl(url)?.platform).toBe('unsupported');
  });
});

describe('resolveSpotifyShortLink', () => {
  const trackUrl = 'https://open.spotify.com/track/7CI5IAi2z70tyJIVXxsHfw';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a short link that HTTP-redirects to a track URL', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html></html>',
      request: { res: { responseUrl: `${trackUrl}?si=abc123` } }
    });

    expect(await resolveSpotifyShortLink('https://spotify.link/AbC123xyz')).toBe(trackUrl);
  });

  it('resolves a short link whose track URL is only in the page body', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: `<meta property="og:url" content="${trackUrl}">`,
      request: { res: { responseUrl: 'https://spotify.app.link/AbC123xyz?_p=xyz' } }
    });

    expect(await resolveSpotifyShortLink('https://spotify.link/AbC123xyz')).toBe(trackUrl);
  });

  it('returns null when no track URL can be found or the request fails', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: '<html></html>', request: { res: { responseUrl: 'https://open.spotify.com/' } } });
    expect(await resolveSpotifyShortLink('https://spotify.link/AbC123xyz')).toBeNull();

    (axios.get as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    expect(await resolveSpotifyShortLink('https://spotify.link/AbC123xyz')).toBeNull();
  });

  it.each([
    trackUrl,
    'https://example.com/AbC123xyz',
    'https://spotify.link.evil.com/AbC123xyz'
  ])('does not fetch non-short-link URL %s', async (url) => {
    expect(await resolveSpotifyShortLink(url)).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
