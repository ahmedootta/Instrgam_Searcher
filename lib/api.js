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
    this.csrftoken = this.extractCsrfFromCookie(this.cookie);
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Extract CSRF token from cookie string
   */
  extractCsrfFromCookie(cookieString) {
    const match = cookieString.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  /**
   * Make authenticated GraphQL request to Instagram
   */
  async makeGraphQLRequest(query, variables = {}) {
    try {
      // Rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const delayMs = config.SEARCH.delaySecs.betweenRequests * 1000;
      
      if (timeSinceLastRequest < delayMs) {
        await sleep(delayMs - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
      this.requestCount++;

      const url = 'https://www.instagram.com/graphql/query/';

      const headers = {
        'User-Agent': this.userAgent,
        'Cookie': this.cookie,
        'X-IG-App-ID': this.appId,
        'X-CSRFTOKEN': this.csrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      };

      // GraphQL requires doc_id format
      const body = new URLSearchParams({
        doc_id: query.doc_id,
        variables: JSON.stringify(variables),
        server_timestamps: 'true'
      });

      const options = {
        method: 'POST',
        headers,
        body: body.toString()
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        logger.warning(`GraphQL returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`GraphQL request failed: ${error.message}`);
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
        
        // DELAY between checks to avoid rate limiting (1.5 seconds)
        await sleep(1500);
      }
      
      logger.info(`Found ${results.length} profiles for "${query}"`);
      return results;
      
    } catch (error) {
      logger.error(`Search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get detailed profile information using web endpoint (more reliable)
   */
  async getProfile(username) {
    try {
      logger.debug(`Fetching profile: @${username}`);

      // Use the web API endpoint that works better
      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      
      // Rate limiting - use longer delay
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const delayMs = config.SEARCH.delaySecs.betweenRequests * 1000;
      
      if (timeSinceLastRequest < delayMs) {
        await sleep(delayMs - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
      this.requestCount++;

      const headers = {
        'User-Agent': this.userAgent,
        'Cookie': this.cookie,
        'X-IG-App-ID': this.appId,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.instagram.com/'
      };

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warning(`Rate limited (429) on @${username} - waiting 60s`);
          await sleep(60000);
          return await this.getProfile(username); // Retry after waiting
        }
        logger.warning(`Could not fetch profile: @${username} (${response.status})`);
        return null;
      }

      const data = await response.json();

      if (!data || !data.data || !data.data.user) {
        logger.warning(`Could not fetch profile: @${username}`);
        return null;
      }

      const user = data.data.user;

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
