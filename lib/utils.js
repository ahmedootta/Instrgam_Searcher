/**
 * Utility functions for PT Finder
 * Reusable helpers for logging, filtering, and data manipulation
 */

const fs = require('fs');
const path = require('path');

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warning: (msg) => console.warn(`⚠️  ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`),
  section: (msg) => {
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 ${msg}`);
    console.log('='.repeat(60) + '\n');
  }
};

/**
 * Check if profile meets filter criteria
 */
function filterProfile(profile, bioKeywords, excludeKeywords) {
  try {
    const { is_private, username, biography, edge_followed_by } = profile;
    const followers = edge_followed_by?.count || 0;

    // Check if public
    if (is_private) {
      return { pass: false, reason: 'Account is private' };
    }

    // Check bio for trainer keywords
    const bio = (biography || '').toLowerCase();
    const hasBioKeyword = bioKeywords.english.concat(bioKeywords.arabic)
      .some(keyword => bio.includes(keyword.toLowerCase()));

    if (!hasBioKeyword) {
      return { pass: false, reason: 'No trainer keyword in bio' };
    }

    // Check for exclude keywords
    const hasExcludeKeyword = excludeKeywords.english.concat(excludeKeywords.arabic)
      .some(keyword => bio.includes(keyword.toLowerCase()));

    if (hasExcludeKeyword) {
      return { pass: false, reason: 'Has exclude keyword (not a trainer)' };
    }

    return { pass: true, reason: 'All checks passed' };
  } catch (error) {
    return { pass: false, reason: `Filter error: ${error.message}` };
  }
}

/**
 * Extract trainer info from profile
 */
function extractTrainerInfo(profile, searchKeyword) {
  try {
    return {
      username: profile.username || '',
      fullName: profile.full_name || '',
      userId: profile.id || '',
      followers: profile.edge_followed_by?.count || 0,
      following: profile.edge_follow?.count || 0,
      postsCount: profile.edge_owner_to_timeline_media?.count || 0,
      verified: profile.is_verified ? 'Yes' : 'No',
      businessAccount: profile.is_business_account ? 'Yes' : 'No',
      isPrivate: profile.is_private ? 'Yes' : 'No',
      profileImageUrl: profile.profile_pic_url_hd || profile.profile_pic_url || '',
      bio: profile.biography || '',
      searchKeyword: searchKeyword,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error extracting trainer info: ${error.message}`);
    return null;
  }
}

/**
 * Remove duplicate trainers by username
 */
function deduplicateTrainers(trainers) {
  const seen = new Set();
  const unique = [];

  for (const trainer of trainers) {
    if (!seen.has(trainer.username.toLowerCase())) {
      seen.add(trainer.username.toLowerCase());
      unique.push(trainer);
    }
  }

  return unique;
}

/**
 * Save data to JSON file
 */
function saveJSON(filepath, data) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logger.success(`Data saved to: ${filepath}`);
    return true;
  } catch (error) {
    logger.error(`Error saving JSON: ${error.message}`);
    return false;
  }
}

/**
 * Save data to CSV file with proper formatting
 */
function saveCSV(filepath, trainers, headers) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // CSV header
    const headerRow = headers.map(h => `"${h}"`).join(',');

    // CSV rows with proper escaping
    const rows = trainers.map(trainer =>
      headers.map(header => {
        let value = trainer[header];
        if (value === null || value === undefined) return '';
        
        // Escape quotes in values
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      }).join(',')
    );

    // Combine header + rows
    const csvContent = [headerRow, ...rows].join('\n');
    fs.writeFileSync(filepath, csvContent);
    logger.success(`CSV saved: ${filepath} (${trainers.length} trainers)`);
    return true;
  } catch (error) {
    logger.error(`Error saving CSV: ${error.message}`);
    return false;
  }
}

/**
 * Load JSON file
 */
function loadJSON(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading JSON from ${filepath}: ${error.message}`);
    return null;
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sleep for N milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build search query from name and keyword/location/hashtag
 */
function buildSearchQuery(name, searchTerm) {
  // Clean and combine
  const cleanName = name.trim();
  const cleanTerm = searchTerm.trim();
  
  // Return combined search query
  return `${cleanName} ${cleanTerm}`;
}

module.exports = {
  logger,
  filterProfile,
  extractTrainerInfo,
  deduplicateTrainers,
  saveJSON,
  saveCSV,
  loadJSON,
  formatDate,
  sleep,
  buildSearchQuery
};
