#!/usr/bin/env node

/**
 * 🎯 COMPLETE PT FINDER - Egypt Personal Trainers Discovery System
 * 
 * STRATEGY: 
 * - Use Instagram's REAL search API (like SQL %LIKE%)
 * - Search across username, full_name, bio simultaneously
 * - Two-phase approach: Names first, then Keywords
 * - Filter results programmatically
 * 
 * STEPS:
 * 1. Verify Authentication Works
 * 2. Test Basic Profile Fetching  
 * 3. Test Name-Based Search
 * 4. Expand to Multiple Names
 * 5. Run Full Phase 1 Search
 * 6. Run Phase 2 & 3
 * 7. Final Deduplication & Analysis
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class CompletePTFinder {
  constructor() {
    // Authentication
    this.cookie = process.env.COOKIE || '';
    this.userAgent = process.env.USER_AGENT || '';
    this.appId = process.env.X_IG_APP_ID || '936619743392459';
    this.csrftoken = this.extractCsrfFromCookie(this.cookie);
    
    // Data storage
    this.allTrainers = [];
    this.searchLog = [];
    this.duplicatesRemoved = 0;
    
    // Configuration
    this.delays = {
      betweenSearches: 2000,    // 2 seconds between searches
      betweenProfiles: 1000,    // 1 second between profile fetches
      betweenPhases: 5000       // 5 seconds between phases
    };
    
    this.filters = {
      minFollowers: 100,
      mustBePublic: true,
      bioKeywords: [
        // English fitness keywords
        'trainer', 'coach', 'fitness', 'gym', 'personal', 'pt', 'crossfit',
        'yoga', 'pilates', 'bodybuilding', 'nutrition', 'workout',
        // Arabic fitness keywords  
        'مدرب', 'كوتش', 'فتنس', 'جيم', 'شخصي', 'تدريب', 'رياضة', 'لياقة'
      ],
      excludeKeywords: [
        'musician', 'singer', 'artist', 'photographer', 'food', 'travel',
        'fashion', 'beauty', 'makeup', 'hair', 'nail', 'wedding'
      ]
    };
  }

  extractCsrfFromCookie(cookieString) {
    const match = cookieString.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      'info': 'ℹ️ ',
      'success': '✅',
      'warning': '⚠️ ',
      'error': '❌',
      'debug': '🔍'
    }[type] || 'ℹ️ ';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
    this.searchLog.push({ timestamp, type, message });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================================================================================
  // STEP 1: VERIFY AUTHENTICATION WORKS
  // ==================================================================================
  
  async step1_verifyAuthentication() {
    this.log('🚀 STEP 1: Verifying Authentication', 'info');
    
    if (!this.cookie) {
      this.log('Missing COOKIE in .env file', 'error');
      return false;
    }
    
    if (!this.csrftoken) {
      this.log('Could not extract CSRF token from cookie', 'error');
      return false;
    }
    
    this.log(`Cookie length: ${this.cookie.length} chars`, 'info');
    this.log(`CSRF token: ${this.csrftoken}`, 'info');
    this.log(`User Agent: ${this.userAgent.substring(0, 50)}...`, 'info');
    this.log(`App ID: ${this.appId}`, 'info');
    
    // Test with a simple search
    try {
      const testResult = await this.searchInstagram('instagram');
      if (testResult.length > 0) {
        this.log(`Authentication test successful! Found ${testResult.length} results`, 'success');
        this.log(`Test result: @${testResult[0].username} - ${testResult[0].full_name}`, 'success');
        return true;
      } else {
        this.log('Authentication test failed - no results returned', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Authentication test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // ==================================================================================
  // STEP 2: TEST WITH "SAM" AND "COACH" - CHECK IF SAMSAMOUY IS CAUGHT
  // ==================================================================================
  
  async step2_testSamAndCoach() {
    this.log('🚀 STEP 2: Testing with "sam coach" combined search', 'info');
    
    const testQueries = ['sam coach'];
    const allResults = [];
    
    for (const query of testQueries) {
      this.log(`Searching for: "${query}"`, 'info');
      
      const results = await this.searchInstagram(query);
      this.log(`Found ${results.length} profiles for "${query}"`, 'info');
      
      // Check if samsamouy is in results
      const samsamouy = results.find(u => u.username === 'samsamouy');
      if (samsamouy) {
        this.log(`🎯 FOUND @samsamouy in "${query}" search!`, 'success');
        this.log(`   Name: ${samsamouy.full_name}`, 'info');
        this.log(`   Followers: ${samsamouy.followers}`, 'info');
        this.log(`   Bio: ${samsamouy.bio}`, 'info');
      } else {
        this.log(`@samsamouy NOT found in "${query}" search`, 'warning');
      }
      
      // Show top 5 results
      results.slice(0, 5).forEach((user, i) => {
        this.log(`  ${i+1}. @${user.username} - ${user.full_name} (${user.followers} followers)`, 'info');
      });
      
      allResults.push({
        query: query,
        count: results.length,
        samsamouy_found: !!samsamouy,
        results: results
      });
      
      await this.delay(this.delays.betweenSearches);
    }
    
    // Save results to JSON
    this.saveTestResults(allResults);
    
    return true;
  }
  
  saveTestResults(results) {
    const outputDir = './scraper_output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = path.join(outputDir, 'step2_sam_coach_test.json');
    fs.writeFileSync(filepath, JSON.stringify({
      test_name: 'Sam and Coach Search Test',
      timestamp: new Date().toISOString(),
      results: results
    }, null, 2));
    
    this.log(`✅ Test results saved to: ${filepath}`, 'success');
  }

  // ==================================================================================
  // STEP 3: TEST NAME-BASED SEARCH (COMMENTED OUT)
  // ==================================================================================
  
  /*
  async step3_testNameBasedSearch() {
    this.log('🚀 STEP 3: Testing Name-Based Search', 'info');
    
    const testNames = ['ahmed', 'mohammed', 'sara', 'omar', 'fatma'];
    
    for (const name of testNames) {
      this.log(`Searching for name: "${name}"`, 'info');
      
      const results = await this.searchInstagram(name);
      this.log(`Found ${results.length} profiles for "${name}"`, 'info');
      
      // Show top 3 results
      results.slice(0, 3).forEach((user, i) => {
        this.log(`  ${i+1}. @${user.username} - ${user.full_name}`, 'info');
      });
      
      // Filter for potential trainers
      const potentialTrainers = await this.filterPotentialTrainers(results, name);
      this.log(`Found ${potentialTrainers.length} potential trainers for "${name}"`, 'success');
      
      await this.delay(this.delays.betweenSearches);
    }
    
    return true;
  }
  */

  // ==================================================================================
  // STEP 4: EXPAND TO MULTIPLE NAMES (COMMENTED OUT)
  // ==================================================================================
  
  /*
  async step4_expandToMultipleNames() {
    this.log('🚀 STEP 4: Expanding to Multiple Names (20 names)', 'info');
    
    const egyptianNames = [
      'ahmed', 'mohammed', 'ali', 'hassan', 'omar', 'sara', 'fatma', 'aisha', 
      'maryam', 'khadija', 'amr', 'tamer', 'hany', 'sherif', 'mahmoud',
      'nour', 'aya', 'rana', 'dina', 'reem'
    ];
    
    let totalFound = 0;
    
    for (const name of egyptianNames) {
      this.log(`Processing name: "${name}" (${egyptianNames.indexOf(name) + 1}/${egyptianNames.length})`, 'info');
      
      const results = await this.searchInstagram(name);
      const trainers = await this.filterPotentialTrainers(results, name);
      
      totalFound += trainers.length;
      this.allTrainers.push(...trainers);
      
      this.log(`Name "${name}": ${trainers.length} trainers found (Total: ${totalFound})`, 'success');
      
      await this.delay(this.delays.betweenSearches);
    }
    
    // Remove duplicates
    this.removeDuplicates();
    this.log(`Phase completed: ${this.allTrainers.length} unique trainers found`, 'success');
    
    return true;
  }
  */

  // ==================================================================================
  // STEP 5: RUN FULL PHASE 1 SEARCH (COMMENTED OUT)
  // ==================================================================================
  
  /*
  async step5_runFullPhase1() {
    this.log('🚀 STEP 5: Running Full Phase 1 - All Egyptian Names', 'info');
    
    // Load all Egyptian names from data file
    const namesData = this.loadEgyptianNames();
    if (!namesData) {
      this.log('Failed to load Egyptian names data', 'error');
      return false;
    }
    
    const allNames = [...namesData.maleNames, ...namesData.femaleNames];
    this.log(`Loaded ${allNames.length} Egyptian names`, 'info');
    
    let processed = 0;
    
    for (const name of allNames) {
      processed++;
      this.log(`Processing: "${name}" (${processed}/${allNames.length})`, 'info');
      
      const results = await this.searchInstagram(name);
      const trainers = await this.filterPotentialTrainers(results, name);
      
      this.allTrainers.push(...trainers);
      
      if (trainers.length > 0) {
        this.log(`Found ${trainers.length} trainers for "${name}"`, 'success');
      }
      
      // Every 50 names, save progress
      if (processed % 50 === 0) {
        this.removeDuplicates();
        this.saveProgress(`phase1_progress_${processed}`);
        this.log(`Progress saved: ${this.allTrainers.length} trainers so far`, 'info');
      }
      
      await this.delay(this.delays.betweenSearches);
    }
    
    this.removeDuplicates();
    this.saveResults('phase1_complete');
    this.log(`Phase 1 completed: ${this.allTrainers.length} unique trainers`, 'success');
    
    return true;
  }
  */

  // ==================================================================================
  // STEP 6: RUN PHASE 2 & 3 (COMMENTED OUT)
  // ==================================================================================
  
  /*
  async step6_runPhase2and3() {
    this.log('🚀 STEP 6: Running Phase 2 & 3 - Keyword Searches', 'info');
    
    // Phase 2: Basic fitness keywords
    const phase2Keywords = [
      'personal trainer', 'fitness coach', 'gym trainer', 'crossfit coach',
      'مدرب شخصي', 'مدرب فتنس', 'كوتش', 'مدرب جيم'
    ];
    
    await this.delay(this.delays.betweenPhases);
    
    for (const keyword of phase2Keywords) {
      this.log(`Phase 2 - Searching: "${keyword}"`, 'info');
      
      const results = await this.searchInstagram(keyword);
      const trainers = await this.filterPotentialTrainers(results, keyword);
      
      this.allTrainers.push(...trainers);
      this.log(`Found ${trainers.length} trainers for "${keyword}"`, 'success');
      
      await this.delay(this.delays.betweenSearches);
    }
    
    // Phase 3: Niche keywords
    const phase3Keywords = [
      'yoga instructor', 'pilates trainer', 'bodybuilding coach',
      'nutrition coach', 'strength coach', 'cardio trainer'
    ];
    
    await this.delay(this.delays.betweenPhases);
    
    for (const keyword of phase3Keywords) {
      this.log(`Phase 3 - Searching: "${keyword}"`, 'info');
      
      const results = await this.searchInstagram(keyword);
      const trainers = await this.filterPotentialTrainers(results, keyword);
      
      this.allTrainers.push(...trainers);
      this.log(`Found ${trainers.length} trainers for "${keyword}"`, 'success');
      
      await this.delay(this.delays.betweenSearches);
    }
    
    this.removeDuplicates();
    this.saveResults('phase2and3_complete');
    this.log(`Phases 2&3 completed: ${this.allTrainers.length} total trainers`, 'success');
    
    return true;
  }
  */

  // ==================================================================================
  // STEP 7: FINAL DEDUPLICATION & ANALYSIS (COMMENTED OUT)
  // ==================================================================================
  
  /*
  async step7_finalAnalysis() {
    this.log('🚀 STEP 7: Final Deduplication & Analysis', 'info');
    
    const beforeCount = this.allTrainers.length;
    this.removeDuplicates();
    const afterCount = this.allTrainers.length;
    
    this.log(`Removed ${beforeCount - afterCount} duplicates`, 'info');
    this.log(`Final count: ${afterCount} unique trainers`, 'success');
    
    // Sort by follower count
    this.allTrainers.sort((a, b) => b.followers - a.followers);
    
    // Generate statistics
    const stats = this.generateStatistics();
    
    // Save final results
    this.saveFinalResults();
    
    this.log('🎉 PT Finder completed successfully!', 'success');
    this.log(`📊 Found ${this.allTrainers.length} Egyptian personal trainers`, 'success');
    
    return true;
  }
  */

  // ==================================================================================
  // HELPER METHODS
  // ==================================================================================

  async searchInstagram(query) {
    try {
      const searchUrl = 'https://www.instagram.com/web/search/topsearch/';
      const params = new URLSearchParams({
        context: 'user',
        query: query.toLowerCase(), // Instagram is case-insensitive
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

      const response = await fetch(`${searchUrl}?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const users = [];

      if (data.users) {
        for (const userObj of data.users) {
          const user = userObj.user;
          users.push({
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

      return users;

    } catch (error) {
      this.log(`Search error for "${query}": ${error.message}`, 'error');
      return [];
    }
  }

  async filterPotentialTrainers(users, searchTerm) {
    const trainers = [];
    
    for (const user of users) {
      // Skip private accounts if required
      if (this.filters.mustBePublic && user.is_private) {
        continue;
      }
      
      // Skip accounts with too few followers
      if (user.followers < this.filters.minFollowers) {
        continue;
      }
      
      // Check if bio contains fitness keywords
      const bioLower = user.bio.toLowerCase();
      const hasFitnessKeyword = this.filters.bioKeywords.some(keyword => 
        bioLower.includes(keyword.toLowerCase())
      );
      
      // Skip if no fitness keywords in bio
      if (!hasFitnessKeyword) {
        continue;
      }
      
      // Check exclude keywords
      const hasExcludeKeyword = this.filters.excludeKeywords.some(keyword =>
        bioLower.includes(keyword.toLowerCase())
      );
      
      if (hasExcludeKeyword) {
        continue;
      }
      
      // This is a potential trainer
      trainers.push({
        username: user.username,
        full_name: user.full_name,
        followers: user.followers,
        is_verified: user.is_verified,
        is_private: user.is_private,
        bio: user.bio,
        search_term: searchTerm,
        found_at: new Date().toISOString()
      });
    }
    
    return trainers;
  }

  removeDuplicates() {
    const seen = new Set();
    const beforeCount = this.allTrainers.length;
    
    this.allTrainers = this.allTrainers.filter(trainer => {
      if (seen.has(trainer.username)) {
        return false;
      }
      seen.add(trainer.username);
      return true;
    });
    
    this.duplicatesRemoved += beforeCount - this.allTrainers.length;
  }

  saveProgress(filename) {
    const outputDir = './scraper_output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = path.join(outputDir, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify({
      trainers: this.allTrainers,
      stats: {
        total: this.allTrainers.length,
        duplicatesRemoved: this.duplicatesRemoved,
        timestamp: new Date().toISOString()
      }
    }, null, 2));
    
    this.log(`Progress saved to ${filepath}`, 'success');
  }

  // ==================================================================================
  // MAIN EXECUTION
  // ==================================================================================

  async run() {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    🎯 COMPLETE PT FINDER - EGYPT                           ║
║                                                                            ║
║  Discovering ALL Personal Trainers in Egypt using Instagram Search        ║
║  Step-by-step execution for smooth progress tracking                       ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

    try {
      // Only Step 1 is active - others are commented out
      const step1Success = await this.step1_verifyAuthentication();
      
      if (!step1Success) {
        this.log('Step 1 failed - cannot proceed', 'error');
        return false;
      }
      
      this.log('🎉 Step 1 completed successfully!', 'success');
      this.log('Moving to Step 2...', 'info');
      
      // Step 2: Test with sam and coach
      const step2Success = await this.step2_testSamAndCoach();
      if (!step2Success) {
        this.log('Step 2 failed', 'error');
        return false;
      }
      
      this.log('🎉 Step 2 completed successfully!', 'success');
      
      // Commented out - uncomment one by one as needed
      // await this.step2_testBasicProfileFetching();
      // await this.step3_testNameBasedSearch();
      // await this.step4_expandToMultipleNames();
      // await this.step5_runFullPhase1();
      // await this.step6_runPhase2and3();
      // await this.step7_finalAnalysis();
      
      return true;
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the script
async function main() {
  const finder = new CompletePTFinder();
  await finder.run();
}

if (require.main === module) {
  main();
}