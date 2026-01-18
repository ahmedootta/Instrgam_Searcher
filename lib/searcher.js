/**
 * PT Finder - Main Searcher Module
 * Orchestrates the three-phase search across Egyptian names
 */

const config = require('../config');
const { logger, sleep, buildSearchQuery, loadJSON, extractTrainerInfo, 
        filterProfile, deduplicateTrainers, formatDate } = require('./utils');
const api = require('./api');

class PTFinder {
  constructor() {
    this.names = [];
    this.keywords = {};
    this.allTrainers = [];
    this.searchLog = [];
  }

  /**
   * Generate case variations for a name
   * Returns: [Normal, lowercase, UPPERCASE]
   */
  generateCaseVariations(name) {
    return [
      name,                                    // Ahmed (original)
      name.toLowerCase(),                      // ahmed
      name.toUpperCase()                       // AHMED
    ];
  }

  /**
   * Initialize: Load names and keywords
   */
  async initialize() {
    logger.section('INITIALIZING PT FINDER');

    // Load names
    const namesData = loadJSON(config.DATA.namesFile);
    if (!namesData) {
      logger.error('Failed to load names data');
      return false;
    }
    this.names = [...namesData.maleNames, ...namesData.femaleNames];
    logger.success(`Loaded ${this.names.length} Egyptian names`);

    // Load keywords
    const keywordsData = loadJSON(config.DATA.keywordsFile);
    if (!keywordsData) {
      logger.error('Failed to load keywords data');
      return false;
    }
    this.keywords = keywordsData;
    logger.success(`Loaded keywords for 3 phases`);

    return true;
  }

  /**
   * PHASE 1: Name × Egyptian Locations
   */
  async phase1SearchNameLocations() {
    logger.section('PHASE 1: Names × Egyptian Locations (with case variations)');

    const locations = this.keywords.egyptianLocations;
    let phaseCount = 0;
    const phaseTotal = this.names.length * 3 * locations.length; // 3 case variations

    for (const name of this.names) {
      const nameVariations = this.generateCaseVariations(name);

      for (const nameVar of nameVariations) {
        for (const location of locations) {
          phaseCount++;

          const searchQuery = buildSearchQuery(nameVar, location);
          logger.info(`[${phaseCount}/${phaseTotal}] Searching: "${searchQuery}"`);

          const users = await api.searchUsers(searchQuery);
          
          for (const user of users) {
            // Get detailed profile
            const profile = await api.getProfile(user.username);
            if (!profile) continue;

            // Filter profile
            const filterResult = filterProfile(profile, this.keywords.bioFilterKeywords, this.keywords.excludeKeywords);
            if (!filterResult.pass) {
              logger.debug(`Skipped @${user.username}: ${filterResult.reason}`);
              continue;
            }

            // Extract and store
            const trainer = extractTrainerInfo(profile, `${nameVar} + ${location}`);
            if (trainer) {
              this.allTrainers.push(trainer);
              logger.success(`Found trainer: @${trainer.username} (${trainer.followers} followers)`);
            }
          }

          // Delay between searches
          if (phaseCount % (locations.length * 3) === 0) {
            await sleep(config.SEARCH.delaySecs.betweenNames * 1000);
          }
        }
      }
    }

    logger.success(`Phase 1 complete: Found ${this.allTrainers.length} trainers`);
  }

  /**
   * PHASE 2: Name × Egyptian Hashtags
   */
  async phase2SearchNameHashtags() {
    logger.section('PHASE 2: Names × Egyptian Hashtags (with case variations)');

    const hashtags = this.keywords.egyptianFitnessHashtags;
    let phaseCount = 0;
    const phaseTotal = this.names.length * 3 * hashtags.length; // 3 case variations

    for (const name of this.names) {
      const nameVariations = this.generateCaseVariations(name);

      for (const nameVar of nameVariations) {
        for (const hashtag of hashtags) {
          phaseCount++;

          const searchQuery = buildSearchQuery(nameVar, hashtag);
          logger.info(`[${phaseCount}/${phaseTotal}] Searching: "${searchQuery}"`);

          const users = await api.searchUsers(searchQuery);
          
          for (const user of users) {
            const profile = await api.getProfile(user.username);
            if (!profile) continue;

            const filterResult = filterProfile(profile, this.keywords.bioFilterKeywords, this.keywords.excludeKeywords);
            if (!filterResult.pass) {
              logger.debug(`Skipped @${user.username}: ${filterResult.reason}`);
              continue;
            }

            const trainer = extractTrainerInfo(profile, `${nameVar} + ${hashtag}`);
            if (trainer) {
              this.allTrainers.push(trainer);
              logger.success(`Found trainer: @${trainer.username} (${trainer.followers} followers)`);
            }
          }

          if (phaseCount % (hashtags.length * 3) === 0) {
            await sleep(config.SEARCH.delaySecs.betweenNames * 1000);
          }
        }
      }
    }

    logger.success(`Phase 2 complete: Total trainers so far: ${this.allTrainers.length}`);
  }

  /**
   * PHASE 3: Name × PT Keywords
   */
  async phase3SearchNameKeywords() {
    logger.section('PHASE 3: Names × PT Keywords (with case variations)');

    const keywords = [...this.keywords.ptKeywordsEnglish, ...this.keywords.ptKeywordsArabic];
    let phaseCount = 0;
    const phaseTotal = this.names.length * 3 * keywords.length; // 3 case variations

    for (const name of this.names) {
      const nameVariations = this.generateCaseVariations(name);

      for (const nameVar of nameVariations) {
        for (const keyword of keywords) {
          phaseCount++;

          const searchQuery = buildSearchQuery(nameVar, keyword);
          logger.info(`[${phaseCount}/${phaseTotal}] Searching: "${searchQuery}"`);

          const users = await api.searchUsers(searchQuery);
          
          for (const user of users) {
            const profile = await api.getProfile(user.username);
            if (!profile) continue;

            const filterResult = filterProfile(profile, this.keywords.bioFilterKeywords, this.keywords.excludeKeywords);
            if (!filterResult.pass) {
              logger.debug(`Skipped @${user.username}: ${filterResult.reason}`);
              continue;
            }

            const trainer = extractTrainerInfo(profile, `${nameVar} + ${keyword}`);
            if (trainer) {
              this.allTrainers.push(trainer);
              logger.success(`Found trainer: @${trainer.username} (${trainer.followers} followers)`);
            }
          }

          if (phaseCount % (keywords.length * 3) === 0) {
            await sleep(config.SEARCH.delaySecs.betweenNames * 1000);
          }
        }
      }
    }

    logger.success(`Phase 3 complete: Total trainers found: ${this.allTrainers.length}`);
  }

  /**
   * Run all three phases
   */
  async runAllPhases() {
    try {
      if (!await this.initialize()) {
        return false;
      }

      await this.phase1SearchNameLocations();
      await sleep(config.SEARCH.delaySecs.betweenPhases * 1000);

      await this.phase2SearchNameHashtags();
      await sleep(config.SEARCH.delaySecs.betweenPhases * 1000);

      await this.phase3SearchNameKeywords();

      return true;
    } catch (error) {
      logger.error(`Error during search: ${error.message}`);
      return false;
    }
  }

  /**
   * Get final results with deduplication
   */
  getResults() {
    logger.section('FINALIZING RESULTS');

    const before = this.allTrainers.length;
    const unique = deduplicateTrainers(this.allTrainers);
    const after = unique.length;
    const duplicates = before - after;

    logger.success(`Before dedup: ${before} trainers`);
    logger.success(`After dedup: ${after} unique trainers`);
    logger.success(`Removed: ${duplicates} duplicates`);

    return unique;
  }

  /**
   * Export results to JSON and CSV
   */
  exportResults(trainers) {
    const { saveJSON, saveCSV } = require('./utils');
    const dateStr = formatDate();

    const jsonPath = `${config.OUTPUT.directory}/${config.OUTPUT.jsonFilename}${dateStr}.json`;
    const csvPath = `${config.OUTPUT.directory}/${config.OUTPUT.csvFilename}${dateStr}.csv`;

    const headers = [
      'username', 'fullName', 'userId', 'followers', 'following', 
      'postsCount', 'verified', 'businessAccount', 'isPrivate', 
      'bio', 'profileImageUrl', 'searchKeyword', 'timestamp'
    ];

    saveJSON(jsonPath, {
      metadata: {
        total: trainers.length,
        exportDate: new Date().toISOString(),
        country: 'Egypt',
        api: 'Instagram Web API'
      },
      trainers: trainers
    });

    saveCSV(csvPath, trainers, headers);

    logger.success(`\n✨ EXPORT COMPLETE ✨`);
    logger.success(`JSON: ${jsonPath}`);
    logger.success(`CSV: ${csvPath}`);

    return { jsonPath, csvPath };
  }
}

module.exports = PTFinder;
