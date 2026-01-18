/**
 * Instagram API Module
 * Handles all API calls to Instagram's GraphQL endpoint
 */

// Use global fetch (Node 18+) instead of node-fetch
// const fetch = require('node-fetch'); // Not needed - use global fetch
const config = require('../config');
const { logger, sleep } = require('./utils');
require('dotenv').config();

class InstagramAPI {
  constructor() {
    this.cookie = process.env.COOKIE || '';
    this.userAgent = process.env.USER_AGENT || config.API.headers['User-Agent'];
    this.appId = process.env.X_IG_APP_ID || config.API.headers['X-IG-App-ID'];
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Make authenticated request to Instagram
   */
  async makeRequest(url, method = 'GET', body = null) {
    try {
      // Rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const delayMs = config.SEARCH.delaySecs.betweenRequests * 1000;
      
      if (timeSinceLastRequest < delayMs) {
        await sleep(delayMs - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
      this.requestCount++;

      const headers = {
        ...config.API.headers,
        'Cookie': this.cookie,
        'User-Agent': this.userAgent,
        'X-IG-App-ID': this.appId,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Referer': 'https://www.instagram.com/'
      };

      const options = {
        method,
        headers
      };

      if (body) {
        options.body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        logger.warning(`API returned ${response.status} for ${url}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Request failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Search Instagram users by query
   * Since Instagram doesn't have public search API, we'll try common username patterns
   */
  async searchUsers(query) {
    try {
      logger.debug(`Searching for patterns related to: "${query}"`);
      
      const results = [];
      const [name, location] = query.split(' ');
      
      // Try common username patterns for the name
      const usernamePatterns = [
        name.toLowerCase(),
        `${name.toLowerCase()}_pt`,
        `${name.toLowerCase()}_trainer`,
        `${name.toLowerCase()}_coach`,
        `${name.toLowerCase()}_fitness`,
        `${name.toLowerCase()}pt`,
        `${name.toLowerCase()}trainer`,
        `${name.toLowerCase()}coach`,
        `pt_${name.toLowerCase()}`,
        `trainer_${name.toLowerCase()}`,
        `coach_${name.toLowerCase()}`,
        `${name.toLowerCase()}_gym`
      ];
      
      logger.info(`Trying ${usernamePatterns.length} username patterns for "${name}"`);
      
      // Try each pattern and see if the profile exists
      for (const username of usernamePatterns) {
        const profile = await this.getProfile(username);
        if (profile) {
          logger.success(`Found existing profile: @${username}`);
          results.push({
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            profile_pic_url: profile.profile_pic_url,
            profile_pic_url_hd: profile.profile_pic_url_hd,
            is_private: profile.is_private,
            is_verified: profile.is_verified,
            is_business_account: profile.is_business_account
          });
        }
        
        // Small delay between checks
        await sleep(200);
      }
      
      logger.info(`Found ${results.length} profiles for "${query}"`);
      return results;
      
    } catch (error) {
      logger.error(`Search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get detailed profile information
   */
  async getProfile(username) {
    try {
      logger.debug(`Fetching profile: @${username}`);

      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      const response = await this.makeRequest(url);

      if (!response || !response.data || !response.data.user) {
        logger.warning(`Could not fetch profile: @${username}`);
        return null;
      }

      const user = response.data.user;

      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        biography: user.biography,
        profile_pic_url: user.profile_pic_url,
        profile_pic_url_hd: user.profile_pic_url_hd,
        is_private: user.is_private,
        is_verified: user.is_verified,
        is_business_account: user.is_business_account,
        edge_followed_by: { count: user.edge_followed_by?.count || 0 },
        edge_follow: { count: user.edge_follow?.count || 0 },
        edge_owner_to_timeline_media: { count: user.edge_owner_to_timeline_media?.count || 0 }
      };
    } catch (error) {
      logger.error(`Profile fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }
}

module.exports = new InstagramAPI();
