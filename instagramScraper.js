#!/usr/bin/env node
/**
 * 🚀 Instagram Complete Media Scraper
 * 
 * Features:
 * - Profile metadata extraction
 * - Batch processing multiple accounts
 * - Photo/video detection and downloading
 * - Session validation
 * - Comprehensive error handling
 * - JSON export with detailed info
 * 
 * Usage:
 *   node instagramScraper.js [--help]
 *   node instagramScraper.js [command] [options]
 * 
 * Commands:
 *   profile <username>              Get profile info
 *   batch <user1> <user2> ...       Get multiple profiles
 *   photos <username> [--download]  Get/download photos
 *   test                            Test session validity
 *   help                            Show this help
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  headers: {
    'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Cookie': process.env.COOKIE || '',
    'Accept': 'application/json',
    'X-IG-App-ID': process.env.X_IG_APP_ID || '936619743392459',
  },
  delays: {
    request: 500,   // ms between requests
    batch: 1000,    // ms between batch items
  },
  outputDir: path.join(__dirname, 'scraper_output'),
  maxRetries: 3,
};

// ============================================================================
// UTILITIES
// ============================================================================

const utils = {
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  saveJSON(filename, data) {
    const filepath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  },

  saveCSV(filename, data, headers) {
    const filepath = path.join(CONFIG.outputDir, filename);
    
    // Convert headers to CSV header row
    const headerRow = headers.map(h => `"${h}"`).join(',');
    
    // Convert data rows
    const rows = data.map(item => 
      headers.map(header => {
        let value = item[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      }).join(',')
    );
    
    // Combine header and rows
    const csvContent = [headerRow, ...rows].join('\n');
    fs.writeFileSync(filepath, csvContent);
    return filepath;
  },

  log: {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    section: (title) => {
      console.log('\n' + '='.repeat(70));
      console.log(`  ${title}`);
      console.log('='.repeat(70) + '\n');
    },
  },

  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().split('T')[0];
  },

  formatNumber(num) {
    return num?.toLocaleString() || 'N/A';
  },

  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().split('T')[0];
  },
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

const api = {
  async fetchProfile(username) {
    try {
      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: CONFIG.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Authentication failed - session expired');
      }

      const json = JSON.parse(text);
      return { success: true, data: json.data?.user || json.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async testSession() {
    try {
      utils.log.section('🧪 Testing Session');
      utils.log.info('Checking credentials...');

      // Check env variables
      const required = ['USER_AGENT', 'COOKIE', 'X_IG_APP_ID'];
      const missing = required.filter(key => !process.env[key]);
      
      if (missing.length > 0) {
        utils.log.error(`Missing environment variables: ${missing.join(', ')}`);
        return { success: false, details: {} };
      }

      utils.log.success('Environment variables loaded');

      // Test API connection
      const result = await api.fetchProfile('instagram');
      
      if (result.success) {
        utils.log.success('API authentication successful');
        utils.log.success(`Successfully fetched @instagram profile`);
        
        return {
          success: true,
          details: {
            env: 'OK',
            api: 'OK',
            profile: 'OK',
            account: result.data.username,
          },
        };
      } else {
        utils.log.error(`API test failed: ${result.error}`);
        return { success: false, details: { error: result.error } };
      }
    } catch (error) {
      utils.log.error(`Session test failed: ${error.message}`);
      return { success: false, details: { error: error.message } };
    }
  },
};

// ============================================================================
// PROFILE SCRAPING
// ============================================================================

const scraper = {
  async getProfile(username) {
    utils.log.section(`👤 Fetching Profile: @${username}`);

    const result = await api.fetchProfile(username);
    
    if (!result.success) {
      utils.log.error(result.error);
      return null;
    }

    const user = result.data;

    // Extract profile data
    const profile = {
      timestamp: new Date().toISOString(),
      username: user.username,
      fullName: user.full_name || 'N/A',
      userId: user.id,
      biography: user.biography || 'N/A',
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
      postsCount: user.edge_owner_to_timeline_media?.count || 0,
      verified: user.is_verified || false,
      businessAccount: user.is_business_account || false,
      isPrivate: user.is_private || false,
      profilePicUrl: user.profile_pic_url,
      externalUrl: user.external_url,
      category: user.category_name || null,
    };

    // Display profile
    utils.log.success(`Profile found: @${profile.username}`);
    console.log(`
  📝 ${profile.fullName}
  📄 ${profile.biography}
  
  👥 Followers: ${utils.formatNumber(profile.followers)}
  👤 Following: ${utils.formatNumber(profile.following)}
  📸 Posts: ${utils.formatNumber(profile.postsCount)}
  
  ✓ Verified: ${profile.verified ? 'Yes' : 'No'}
  💼 Business: ${profile.businessAccount ? 'Yes' : 'No'}
  🔒 Private: ${profile.isPrivate ? 'Yes' : 'No'}
    `);

    return profile;
  },

  async getMultipleProfiles(usernames) {
    utils.log.section(`👥 Scraping ${usernames.length} Profiles`);

    const profiles = [];
    const failed = [];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      
      try {
        const profile = await scraper.getProfile(username);
        
        if (profile) {
          profiles.push(profile);
        } else {
          failed.push({ username, error: 'Failed to fetch' });
        }

        // Rate limiting
        if (i < usernames.length - 1) {
          await utils.delay(CONFIG.delays.batch);
        }
      } catch (error) {
        failed.push({ username, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '-'.repeat(70));
    utils.log.success(`Scraped ${profiles.length}/${usernames.length} profiles`);
    
    if (failed.length > 0) {
      utils.log.warn(`Failed: ${failed.map(f => f.username).join(', ')}`);
    }

    // Save results
    const filename = `profiles_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = utils.saveJSON(filename, {
      timestamp: new Date().toISOString(),
      total: usernames.length,
      successful: profiles.length,
      failed: failed.length,
      profiles: profiles,
      errors: failed,
    });

    // Save as CSV
    const csvFilename = `profiles_${new Date().toISOString().split('T')[0]}.csv`;
    const csvHeaders = ['username', 'fullName', 'userId', 'followers', 'following', 'postsCount', 'verified', 'businessAccount', 'isPrivate'];
    const csvData = profiles.map(p => ({
      username: p.username,
      fullName: p.fullName,
      userId: p.userId,
      followers: p.followers,
      following: p.following,
      postsCount: p.postsCount,
      verified: p.verified ? 'Yes' : 'No',
      businessAccount: p.businessAccount ? 'Yes' : 'No',
      isPrivate: p.isPrivate ? 'Yes' : 'No',
    }));
    
    utils.saveCSV(csvFilename, csvData, csvHeaders);

    utils.log.success(`Results saved: ${filename}`);
    utils.log.success(`CSV saved: ${csvFilename}`);
    return profiles;
  },

  async getProfilePhotos(username) {
    utils.log.section(`📸 Fetching Photos: @${username}`);

    const profile = await scraper.getProfile(username);
    
    if (!profile) {
      return null;
    }

    // Try to extract media from profile response
    const result = await api.fetchProfile(username);
    const user = result.data;
    
    const mediaEdges = user.edge_owner_to_timeline_media?.edges || [];
    
    utils.log.info(`Found ${mediaEdges.length} media items`);

    const photos = [];
    const videos = [];

    mediaEdges.forEach((edge, index) => {
      const node = edge.node;
      
      const media = {
        id: node.id,
        index: index + 1,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        url: node.display_url,
        likes: node.edge_liked_by?.count || 0,
        comments: node.edge_media_to_comment?.count || 0,
        timestamp: node.taken_at_timestamp,
        date: utils.formatDate(node.taken_at_timestamp),
        isVideo: node.is_video || false,
      };

      if (node.is_video) {
        videos.push(media);
      } else {
        photos.push(media);
      }
    });

    // Display summary
    console.log(`
  📷 Photos: ${photos.length}
  🎥 Videos: ${videos.length}
    `);

    if (photos.length > 0) {
      console.log('  Recent photos:');
      photos.slice(0, 3).forEach(photo => {
        console.log(`    • ${photo.date}: ${photo.caption.substring(0, 40)}`);
      });
    }

    // Save to file
    const filename = `media_${username}.json`;
    const filepath = utils.saveJSON(filename, {
      timestamp: new Date().toISOString(),
      username: profile.username,
      userId: profile.userId,
      totalPhotos: photos.length,
      totalVideos: videos.length,
      photos: photos,
      videos: videos,
    });

    utils.log.success(`Media data saved: ${filename}`);
    return { profile, photos, videos };
  },

  async downloadPhotos(username, photos) {
    if (!photos || photos.length === 0) {
      utils.log.warn('No photos to download');
      return;
    }

    const downloadDir = path.join(CONFIG.outputDir, `photos_${username}`);
    await utils.ensureDir(downloadDir);

    utils.log.section(`⬇️  Downloading ${photos.length} Photos`);

    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const filename = `${String(i + 1).padStart(3, '0')}_${photo.date}_${photo.id}.jpg`;
      const filepath = path.join(downloadDir, filename);

      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.buffer();
        fs.writeFileSync(filepath, buffer);

        console.log(`  ✅ ${i + 1}/${photos.length}: ${filename}`);
        downloaded++;

        await utils.delay(CONFIG.delays.request);
      } catch (error) {
        console.log(`  ❌ ${i + 1}/${photos.length}: Failed - ${error.message}`);
        failed++;
      }
    }

    console.log('\n' + '-'.repeat(70));
    utils.log.success(`Downloaded: ${downloaded}/${photos.length} photos`);
    
    if (failed > 0) {
      utils.log.warn(`Failed: ${failed} photos`);
    }

    utils.log.success(`Saved to: photos_${username}/`);
  },
};

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

const commands = {
  async profile(args) {
    if (args.length === 0) {
      args = [process.env.IG_USERNAME || 'ahmedootta'];
    }
    
    const username = args[0];
    const profile = await scraper.getProfile(username);
    
    if (profile) {
      utils.saveJSON(`profile_${username}.json`, profile);
    }
  },

  async batch(args) {
    if (args.length === 0) {
      utils.log.error('Usage: batch <user1> <user2> ...');
      return;
    }
    
    await scraper.getMultipleProfiles(args);
  },

  async photos(args) {
    if (args.length === 0) {
      utils.log.error('Usage: photos <username> [--download]');
      return;
    }

    const username = args[0];
    const shouldDownload = args.includes('--download');

    const result = await scraper.getProfilePhotos(username);
    
    if (result && shouldDownload && result.photos.length > 0) {
      await utils.delay(1000);
      await scraper.downloadPhotos(username, result.photos);
    }
  },

  async test() {
    await api.testSession();
  },

  async help() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                  🚀 INSTAGRAM COMPLETE SCRAPER                    ║
║                                                                    ║
║  Extract profiles, photos, and media data from Instagram          ║
║  with full batch processing and download capabilities             ║
╚════════════════════════════════════════════════════════════════════╝

USAGE:
  node instagramScraper.js [command] [options]

COMMANDS:

  profile <username>
    • Get profile metadata
    • Example: node instagramScraper.js profile ahmedootta
    • Or just: node instagramScraper.js (uses default from .env)

  batch <user1> <user2> ...
    • Get multiple profiles at once
    • Saves results to JSON with timestamp
    • Example: node instagramScraper.js batch instagram facebook twitter

  photos <username> [--download]
    • Get list of photos from account
    • Add --download flag to download all photos
    • Example: node instagramScraper.js photos instagram --download

  test
    • Validate your session and credentials
    • Checks environment variables and API access
    • Example: node instagramScraper.js test

  help
    • Show this help message

DEFAULT BEHAVIOR:
  • Without arguments: Shows profile of user in IG_USERNAME (.env)
  • Outputs: JSON files saved to scraper_output/
  • Rate limiting: Built-in delays to prevent blocking

ENVIRONMENT (.env):
  USER_AGENT=<your browser user agent>
  COOKIE=<your Instagram session cookie>
  X_IG_APP_ID=<Instagram app ID>
  IG_USERNAME=<default username>

TIPS:
  • If authentication fails, update your COOKIE in .env
  • Get fresh cookies: Log into Instagram → DevTools → Network tab
  • Private accounts: Photos won't show (Instagram limitation)
  • Public accounts: Full media list and download available
  • Batch processing: 1 second delay between requests (respectful)

EXAMPLES:

  # Test your setup
  node instagramScraper.js test

  # Get your profile
  node instagramScraper.js

  # Get specific profile
  node instagramScraper.js profile instagram

  # Get multiple profiles
  node instagramScraper.js batch instagram facebook twitter

  # Download photos from account
  node instagramScraper.js photos instagram --download

  # Get your profile and save
  node instagramScraper.js profile ahmedootta

═══════════════════════════════════════════════════════════════════════
    `);
  },
};

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  try {
    // Ensure output directory exists
    await utils.ensureDir(CONFIG.outputDir);

    // Parse arguments
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();
    const commandArgs = args.slice(1);

    // Handle commands
    if (!command || command === 'help' || command === '-h' || command === '--help') {
      if (!command) {
        // No arguments - use default profile
        await commands.profile([]);
      } else {
        await commands.help();
      }
    } else if (command === 'test') {
      await commands.test();
    } else if (command === 'batch') {
      await commands.batch(commandArgs);
    } else if (command === 'photos') {
      await commands.photos(commandArgs);
    } else {
      // Assume it's a username for profile command
      await commands.profile([command, ...commandArgs]);
    }

    console.log('\n✨ Done!\n');
    process.exit(0);
  } catch (error) {
    utils.log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { scraper, api, utils };
