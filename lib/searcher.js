/**
 * PT Finder - Smart Searcher Module
 * Implements the priority-based strategy with adaptive rate limiting
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
    this.priorityNames = [];
    this.remainingNames = [];
    this.priorityKeywords = [];
    this.reducedKeywords = [];
    this.broadKeywords = [];
    this.seenUsernames = new Set();
  }

  /**
   * Initialize: load names and keywords, then configure strategy sets
   */
  async initialize() {
    logger.section('INITIALIZING PT FINDER');

    const namesData = loadJSON(config.DATA.namesFile);
    if (!namesData) {
      logger.error('Failed to load names data');
      return false;
    }
    this.names = [...namesData.maleNames, ...namesData.femaleNames].map(n => n.toLowerCase());
    logger.success(`Loaded ${this.names.length} Egyptian names`);

    const keywordsData = loadJSON(config.DATA.keywordsFile);
    if (!keywordsData) {
      logger.error('Failed to load keywords data');
      return false;
    }
    this.keywords = keywordsData;
    logger.success('Loaded keyword sets');

    this.configureKeywordSets();
    return true;
  }

  /**
   * Configure priority lists based on the documented strategy
   */
  configureKeywordSets() {
    const prioritySeed = ['ahmed', 'mohamed', 'mohammed', 'omar', 'ali', 'sara', 'fatma', 'mona', 'nour', 'mariam'];
    const available = new Set(this.names);
    this.priorityNames = prioritySeed.filter(n => available.has(n));
    this.remainingNames = this.names.filter(n => !this.priorityNames.includes(n));

    this.priorityKeywords = ['trainer', 'coach', 'personal trainer', 'مدرب', 'كوتش'];
    this.reducedKeywords = ['trainer', 'coach', 'مدرب'];
    this.broadKeywords = [
      'personal trainer',
      'fitness coach',
      'gym trainer',
      'مدرب شخصي',
      'مدرب لياقة',
      'كوتش فتنس'
    ];

    logger.info(`Priority names: ${this.priorityNames.length}, remaining names: ${this.remainingNames.length}`);
  }

  /**
   * Run the documented smart search phases
   */
  async runAllPhases() {
    try {
      if (!await this.initialize()) {
        return false;
      }

      await this.phasePriorityCombos();
      await sleep(config.SEARCH.delaySecs.betweenPhases * 1000);

      await this.phaseRemainingCombos();
      await sleep(config.SEARCH.delaySecs.betweenPhases * 1000);

      await this.phaseBroadKeywords();
      return true;
    } catch (error) {
      logger.error(`Error during search: ${error.message}`);
      return false;
    }
  }

  async searchAndProcess(query, priorityLabel, contextLabel) {
    const users = await api.searchProfiles(query, priorityLabel);
    logger.info(`[${contextLabel}] ${users.length} candidates for "${query}"`);

    for (const user of users) {
      if (this.seenUsernames.has(user.username.toLowerCase())) {
        continue;
      }

      const profile = await api.getProfile(user.username);
      if (!profile) continue;

      const filterResult = filterProfile(profile, this.keywords.bioFilterKeywords, this.keywords.excludeKeywords);
      if (!filterResult.pass) {
        logger.debug(`Skipped @${user.username}: ${filterResult.reason}`);
        continue;
      }

      const trainer = extractTrainerInfo(profile, contextLabel);
      if (trainer) {
        this.seenUsernames.add(trainer.username.toLowerCase());
        this.allTrainers.push(trainer);
        logger.success(`Found trainer: @${trainer.username} (${trainer.followers} followers)`);
      }
    }
  }

  /**
   * Phase 1: Priority names × priority keywords
   */
  async phasePriorityCombos() {
    logger.section('PHASE 1: Priority Names × Priority Keywords');

    const total = this.priorityNames.length * this.priorityKeywords.length;
    let counter = 0;

    for (const name of this.priorityNames) {
      for (const keyword of this.priorityKeywords) {
        counter++;
        const searchQuery = buildSearchQuery(name, keyword);
        logger.info(`[${counter}/${total}] Searching ${searchQuery}`);
        await this.searchAndProcess(searchQuery, 'high', `${name} + ${keyword}`);
      }
    }

    logger.success(`Phase 1 complete: ${this.allTrainers.length} trainers collected so far`);
  }

  /**
   * Phase 2: Remaining names × reduced keywords
   */
  async phaseRemainingCombos() {
    logger.section('PHASE 2: Remaining Names × Core Keywords');

    const total = this.remainingNames.length * this.reducedKeywords.length;
    let counter = 0;

    for (const name of this.remainingNames) {
      for (const keyword of this.reducedKeywords) {
        counter++;
        const searchQuery = buildSearchQuery(name, keyword);
        logger.info(`[${counter}/${total}] Searching ${searchQuery}`);
        await this.searchAndProcess(searchQuery, 'medium', `${name} + ${keyword}`);
      }
    }

    logger.success(`Phase 2 complete: ${this.allTrainers.length} trainers collected so far`);
  }

  /**
   * Phase 3: Broad keyword-only searches
   */
  async phaseBroadKeywords() {
    logger.section('PHASE 3: Broad Keyword Searches');

    const total = this.broadKeywords.length;
    let counter = 0;

    for (const keyword of this.broadKeywords) {
      counter++;
      logger.info(`[${counter}/${total}] Searching ${keyword}`);
      await this.searchAndProcess(keyword, 'low', keyword);
    }

    logger.success(`Phase 3 complete: ${this.allTrainers.length} trainers collected so far`);
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
