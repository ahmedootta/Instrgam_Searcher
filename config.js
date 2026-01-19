/**
 * Configuration file for PT Finder
 * Centralized settings for all components
 */

module.exports = {
  // API Configuration
  API: {
    baseUrl: 'https://www.instagram.com/api/v1',
    searchEndpoint: '/ig_api/v1/ig_search/web',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-IG-App-ID': '936619743392459',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate'
    }
  },

  // Search Configuration
  SEARCH: {
    minFollowers: 100,
    maxResultsPerKeyword: 100,
    pagesPerKeyword: 3, // How many pages to fetch per keyword
    delaySecs: {
      betweenRequests: 1.5,  // 1500ms (1.5s) between profile requests - AVOID RATE LIMIT
      betweenNames: 3,       // 3 seconds between name searches
      betweenPhases: 5       // 5 seconds between phase transitions
    }
  },

  // Filter Configuration
  FILTER: {
    mustBePublic: true,
    minFollowers: 100,
    requireBioKeyword: true,
    bioKeywordLanguages: ['english', 'arabic'] // Check both languages
  },

  // Output Configuration
  OUTPUT: {
    directory: './scraper_output',
    csvFilename: 'trainers_egypt_',
    jsonFilename: 'trainers_egypt_raw_',
    dateFormat: 'YYYY-MM-DD'
  },

  // Data Files
  DATA: {
    namesFile: './data/names.json',
    keywordsFile: './data/keywords.json'
  },

  // Phases
  PHASES: {
    phase1: 'Names × Egyptian Locations',
    phase2: 'Names × Egyptian Hashtags',
    phase3: 'Names × PT Keywords'
  },

  // Logging
  LOG: {
    verbose: true,
    showProgress: true,
    logSearches: true
  }
};
