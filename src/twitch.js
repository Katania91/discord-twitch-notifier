import fetch from 'node-fetch';

class TwitchAPI {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitch authentication error: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return this.accessToken;
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 60000) {
      await this.authenticate();
    }
  }

  async makeRequest(endpoint, params = {}) {
    await this.ensureValidToken();

    const url = new URL(`https://api.twitch.tv/helix/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUsers(usernames = [], userIds = []) {
    const params = {};
    
    usernames.forEach(username => {
      if (!params.login) params.login = [];
      if (Array.isArray(params.login)) {
        params.login.push(username.toLowerCase());
      }
    });
    
    userIds.forEach(id => {
      if (!params.id) params.id = [];
      if (Array.isArray(params.id)) {
        params.id.push(id);
      }
    });

    const url = new URL('https://api.twitch.tv/helix/users');
    
    if (params.login) {
      params.login.forEach(login => url.searchParams.append('login', login));
    }
    if (params.id) {
      params.id.forEach(id => url.searchParams.append('id', id));
    }

    await this.ensureValidToken();

    const response = await fetch(url, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async getStreams(usernames = [], userIds = []) {
    const url = new URL('https://api.twitch.tv/helix/streams');
    
    usernames.forEach(username => {
      url.searchParams.append('user_login', username.toLowerCase());
    });
    
    userIds.forEach(id => {
      url.searchParams.append('user_id', id);
    });

    await this.ensureValidToken();

    const response = await fetch(url, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Errore API Twitch: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async isStreamLive(username) {
    const streams = await this.getStreams([username]);
    return streams.length > 0 ? streams[0] : null;
  }

  async getGame(gameId) {
    const data = await this.makeRequest('games', { id: gameId });
    return data.data[0] || null;
  }

  async searchChannels(query) {
    const data = await this.makeRequest('search/channels', { query });
    return data.data;
  }
}

export default TwitchAPI;
