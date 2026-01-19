/**
 * Instagram API Module
 * Handles authenticated calls with adaptive rate limiting
 */

const config = require('../config');
const { logger, sleep } = require('./utils');
require('dotenv').config();

class AdaptiveRateLimiter {
  constructor(options = {}) {
    this.baseDelayMs = options.baseDelayMs || 1500;
    this.minDelayMs = options.minDelayMs || 800;
    this.maxDelayMs = options.maxDelayMs || 8000;
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 90;

    this.dynamicDelayMs = this.baseDelayMs;
    this.emptyStreak = 0;
    this.cooldownUntil = 0;
    this.backoffMs = 60000;
    this.requestTimestamps = [];
    this.lastRequestTime = 0;
  }

  baseForPriority(priority) {
    if (priority === 'high') return Math.max(this.baseDelayMs - 300, this.minDelayMs);
    if (priority === 'low') return this.baseDelayMs + 300;
    return this.baseDelayMs;
  }

  async beforeRequest(meta = {}) {
    const now = Date.now();

    if (this.cooldownUntil && now < this.cooldownUntil) {
      await sleep(this.cooldownUntil - now);
    }

    const spacingTarget = Math.max(this.dynamicDelayMs, this.baseForPriority(meta.priority));
    const sinceLast = now - this.lastRequestTime;
    const waitMs = Math.max(spacingTarget - sinceLast, 0);

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    this.lastRequestTime = Date.now();
  }

  afterResponse({ status, resultsCount, responseTimeMs }) {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < 60000);

    if (status === 429) {
      this.cooldownUntil = now + this.backoffMs;
      this.dynamicDelayMs = Math.min(this.dynamicDelayMs * 1.5 + 200, this.maxDelayMs);
      this.backoffMs = Math.min(this.backoffMs * 1.5, this.maxDelayMs * 4);
      return;
    }

    const density = this.requestTimestamps.length;
    if (density > this.maxRequestsPerMinute) {
      this.dynamicDelayMs = Math.min(this.dynamicDelayMs + 400, this.maxDelayMs);
    }

    if (responseTimeMs > 2000) {
      this.dynamicDelayMs = Math.min(this.dynamicDelayMs + 200, this.maxDelayMs);
    } else if (responseTimeMs < 800) {
      this.dynamicDelayMs = Math.max(this.dynamicDelayMs - 100, this.minDelayMs);
    }

    if (resultsCount === 0) {
      this.emptyStreak += 1;
      if (this.emptyStreak >= 3) {
        this.dynamicDelayMs = Math.max(this.dynamicDelayMs - 150, this.minDelayMs);
      }
    } else {
      this.emptyStreak = 0;
      this.dynamicDelayMs = Math.max(this.dynamicDelayMs - 50, this.minDelayMs);
    }
  }
}

class InstagramAPI {
  constructor() {
    this.cookie = process.env.COOKIE || '';
    this.userAgent = process.env.USER_AGENT || config.API.headers['User-Agent'];
    this.appId = process.env.X_IG_APP_ID || config.API.headers['X-IG-App-ID'];
    this.csrftoken = this.extractCsrfFromCookie(this.cookie);
    this.requestCount = 0;

    this.rateLimiter = new AdaptiveRateLimiter({
      baseDelayMs: config.SEARCH.delaySecs.betweenRequests * 1000,
      minDelayMs: 800,
      maxDelayMs: 8000,
      maxRequestsPerMinute: 90
    });
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
      await this.rateLimiter.beforeRequest({ priority: 'medium' });

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

      const start = Date.now();
      const response = await fetch(url, options);
      const responseTime = Date.now() - start;

      if (!response.ok) {
        this.rateLimiter.afterResponse({ status: response.status, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning(`GraphQL returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      const resultsCount = data ? 1 : 0;
      this.rateLimiter.afterResponse({ status: response.status, resultsCount, responseTimeMs: responseTime });
      this.requestCount++;
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
  async searchProfiles(query, priority = 'medium') {
    try {
      logger.debug(`Searching Instagram for: "${query}"`);

      const searchUrl = 'https://www.instagram.com/web/search/topsearch/';
      const params = new URLSearchParams({
        context: 'user',
        query: query.toLowerCase(),
        rank_token: Math.random().toString(36).substring(7),
        include_reel: 'true'
      });

      const headers = {
        'User-Agent': this.userAgent,
        'Cookie': this.cookie,
        'X-IG-App-ID': this.appId,
        'X-CSRFToken': this.csrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
      };

      await this.rateLimiter.beforeRequest({ priority });

      const start = Date.now();
      const response = await fetch(`${searchUrl}?${params}`, { method: 'GET', headers });
      const responseTime = Date.now() - start;

      if (response.status === 429) {
        this.rateLimiter.afterResponse({ status: 429, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning('Rate limited (429) on search - backing off');
        return [];
      }

      if (!response.ok) {
        this.rateLimiter.afterResponse({ status: response.status, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning(`Search failed ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = [];

      if (data.users) {
        for (const userObj of data.users) {
          const user = userObj.user;
          users.push({
            id: user.pk || user.id,
            username: user.username,
            full_name: user.full_name || '',
            followers: user.follower_count || 0,
            is_verified: user.is_verified || false,
            is_private: user.is_private || false,
            profile_pic_url: user.profile_pic_url || '',
            bio: user.biography || ''
          });
        }
      }

      this.rateLimiter.afterResponse({ status: response.status, resultsCount: users.length, responseTimeMs: responseTime });
      this.requestCount++;
      return users;
    } catch (error) {
      logger.error(`Search error: ${error.message}`);
      return [];
    }
  }

  async searchUsers(query, priority = 'medium') {
    return this.searchProfiles(query, priority);
  }

  /**
   * Get detailed profile information using web endpoint (more reliable)
   */
  async getProfile(username) {
    try {
      logger.debug(`Fetching profile: @${username}`);

      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      const headers = {
        'User-Agent': this.userAgent,
        'Cookie': this.cookie,
        'X-IG-App-ID': this.appId,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.instagram.com/'
      };

      await this.rateLimiter.beforeRequest({ priority: 'high' });

      const start = Date.now();
      const response = await fetch(url, { headers });
      const responseTime = Date.now() - start;

      if (response.status === 429) {
        this.rateLimiter.afterResponse({ status: 429, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning(`Rate limited (429) on @${username} - backing off`);
        return null;
      }

      if (!response.ok) {
        this.rateLimiter.afterResponse({ status: response.status, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning(`Could not fetch profile: @${username} (${response.status})`);
        return null;
      }

      const data = await response.json();

      if (!data || !data.data || !data.data.user) {
        this.rateLimiter.afterResponse({ status: response.status, resultsCount: 0, responseTimeMs: responseTime });
        logger.warning(`Could not fetch profile: @${username}`);
        return null;
      }

      const user = data.data.user;
      this.rateLimiter.afterResponse({ status: response.status, resultsCount: 1, responseTimeMs: responseTime });
      this.requestCount++;

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
      lastRequestTime: this.rateLimiter.lastRequestTime ? new Date(this.rateLimiter.lastRequestTime).toISOString() : null,
      dynamicDelayMs: this.rateLimiter.dynamicDelayMs
    };
  }
}

module.exports = new InstagramAPI();
