import axios from 'axios';
import { SpotifyOAuthService } from '../../services/spotify-oauth-service';
import { TokenStorageService } from '../../services/token-storage';
import { SpotifyTokenData } from '../../types';

jest.mock('axios');
jest.mock('../../services/token-storage');

describe('SpotifyOAuthService.getValidToken', () => {
  const expiredToken: SpotifyTokenData = {
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    expiresAt: '2026-01-01T00:00:00.000Z',
    scope: ['playlist-modify-public'],
    tokenType: 'Bearer'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (TokenStorageService.getToken as jest.Mock).mockResolvedValue(expiredToken);
    (TokenStorageService.isTokenExpired as jest.Mock).mockReturnValue(true);
  });

  it('returns null and deletes the stored token when the refresh token has expired', async () => {
    (axios.post as jest.Mock).mockRejectedValue({
      response: { data: { error: 'invalid_grant', error_description: 'Refresh token expired' } }
    });

    const token = await SpotifyOAuthService.getValidToken('user123');

    expect(token).toBeNull();
    expect(TokenStorageService.deleteToken).toHaveBeenCalledWith('user123');
  });

  it('returns null but keeps the stored token on other refresh failures', async () => {
    (axios.post as jest.Mock).mockRejectedValue({ message: 'Network Error' });

    const token = await SpotifyOAuthService.getValidToken('user123');

    expect(token).toBeNull();
    expect(TokenStorageService.deleteToken).not.toHaveBeenCalled();
  });
});
