#!/usr/bin/env node

/**
 * 🎯 PT FINDER - Main Entry Point
 * 
 * Smart priority-based search for Egyptian personal trainers
 * (Adaptive rate limiting + documented Instagram search behavior)
 * 
 * Usage:
 *   node trainerFinder.js                    # Run full smart search
 *   node trainerFinder.js --test             # Run a single high-priority search
 *   node trainerFinder.js --phase1           # Run only priority combos
 *   node trainerFinder.js --help             # Show help
 */

const PTFinder = require('./lib/searcher');
const { logger, formatDate, buildSearchQuery } = require('./lib/utils');
const config = require('./config');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    auth: args.includes('--auth'),
    test: args.includes('--test'),
    phase1: args.includes('--phase1'),
    full: args.includes('--full'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     🎯 PT FINDER - Personal Trainer Searcher              ║
║                        Find All Egyptian Personal Trainers                 ║
╚════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node trainerFinder.js [OPTIONS]

OPTIONS:
  --auth              Step 1: Test authentication and session validity
  --test              Step 2: Single priority search (ahmed + trainer)
  --phase1            Step 3: Run priority combos only (~250 searches)
  --full              Step 4: Full smart search (~2,250 searches)
  --verbose, -v       Show detailed logging
  --help, -h          Show this help message

EXAMPLES:
  # Step 1: Verify your Instagram session works
  node trainerFinder.js --auth

  # Step 2: Test with one priority search 
  node trainerFinder.js --test

  # Step 3: Run only priority combinations (quick results)
  node trainerFinder.js --phase1

  # Step 4: Full production search (all phases)
  node trainerFinder.js --full

  # Show detailed logs
  node trainerFinder.js --full --verbose

OUTPUT:
  Results are saved to: scraper_output/
    - trainers_egypt_YYYY-MM-DD.json  (Complete data)
    - trainers_egypt_YYYY-MM-DD.csv   (Spreadsheet format)

SEARCH STRATEGY:
  Phase 1: Priority names × priority keywords
  Phase 2: Remaining names × core keywords
  Phase 3: Broad keyword-only searches
  ─────────────────────────────────────────────────────
  TOTAL: ~2,250 adaptive, rate-limited searches

FILTERS APPLIED:
  ✓ Public accounts only
  ✓ 100+ followers minimum
  ✓ Must mention "trainer", "coach", "مدرب", "كوتش" in bio
  ✓ Automatic duplicate removal

EXPECTED RESULTS:
  ~1,500-3,000 verified Egyptian personal trainers

TIME ESTIMATE:
  • Full run:  4-8 hours (respecting rate limits)
  • Phase 1:   45 minutes
  • Test:      2-5 minutes

`);
}

/**
 * Step 1: Test authentication and session validity
 */
async function runAuthTest(finder) {
  logger.section('🔐 STEP 1: Authentication & Session Test');
  logger.info('Verifying Instagram session and API access');

  if (!await finder.initialize()) {
    logger.error('Failed to initialize');
    return false;
  }

  // Test with a simple known search
  const users = await finder.searchAndProcess('instagram', 'medium', 'auth-test');
  
  if (users && users.length > 0) {
    logger.success('✅ Authentication successful');
    logger.success('✅ Instagram API responding');
    logger.success('✅ Session is valid');
    return true;
  } else {
    logger.error('❌ Authentication failed - check your .env credentials');
    return false;
  }
}

/**
 * Step 2: Single priority search test
 */
async function runTest(finder) {
  logger.section('🧪 STEP 2: Single Priority Search Test');
  logger.info('Testing high-priority name × keyword combo (ahmed trainer)');

  if (!await finder.initialize()) {
    logger.error('Failed to initialize');
    return false;
  }

  const testName = finder.priorityNames[0] || finder.names[0];
  const testKeyword = finder.priorityKeywords[0];
  const query = buildSearchQuery(testName, testKeyword);

  logger.info(`Searching: "${query}"`);
  await finder.searchAndProcess(query, 'high', `${testName} + ${testKeyword}`);

  const results = finder.getResults();
  logger.success(`✅ Test complete: Found ${results.length} potential trainers`);
  
  if (results.length > 0) {
    logger.info('Sample results:');
    results.slice(0, 3).forEach((trainer, i) => {
      console.log(`  ${i+1}. @${trainer.username} (${trainer.followers} followers)`);
    });
  }

  return true;
}

/**
 * Step 3: Run priority combinations only
 */
async function runPhase1(finder) {
  logger.section('⚡ STEP 3: Priority Combinations Phase');
  logger.info('Running high-probability name × keyword combinations (~250 searches)');

  if (!await finder.initialize()) {
    logger.error('Failed to initialize');
    return false;
  }

  const total = finder.priorityNames.length * finder.priorityKeywords.length;
  logger.info(`Will run ${total} priority searches`);

  await finder.phasePriorityCombos();

  const results = finder.getResults();
  finder.exportResults(results);

  logger.success(`✅ Priority phase complete: ${results.length} trainers found`);
  return true;
}

/**
 * Step 4: Full smart search (all 3 phases)
 */
async function runFull(finder) {
  logger.section('🚀 STEP 4: Full Smart Search (All 3 Phases)');
  logger.info('Running complete adaptive search strategy (~2,250 searches)');
  
  if (!await finder.runAllPhases()) {
    logger.error('Search failed');
    return false;
  }

  const results = finder.getResults();
  const { jsonPath, csvPath } = finder.exportResults(results);

  logger.section('✨ COMPLETE! Egyptian PT Discovery Finished');
  logger.success(`Found: ${results.length} verified personal trainers`);
  logger.success(`JSON: ${jsonPath}`);
  logger.success(`CSV: ${csvPath}`);

  // Show sample
  if (results.length > 0) {
    logger.info(`\nTop trainers by followers:`);
    results
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 5)
      .forEach((t, i) => {
        console.log(`  ${i+1}. @${t.username} (${t.followers} followers) - ${t.fullName}`);
      });
    if (results.length > 5) {
      console.log(`  ... and ${results.length - 5} more`);
    }
  }

  return true;
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  // Show help
  if (args.help) {
    showHelp();
    return;
  }

  // Show banner
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                          🎯 PT FINDER v2.0                                ║
║              Smart Egyptian Personal Trainer Discovery System              ║
║                                                                            ║
║  Strategy: Adaptive priority-based search with Instagram rate limiting     ║
║  Phases: Priority combos → Remaining combos → Broad keywords              ║
║  Total: ~2,250 smart searches (86% fewer than naive approach)             ║
║  Expected: 1,500-3,000 verified trainers in 1-2 hours                    ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();
  logger.info(`Started: ${new Date().toISOString()}`);
  logger.info(`Config: ${JSON.stringify(config.SEARCH, null, 2)}`);

  const finder = new PTFinder();

  try {
    let success = false;

    if (args.test) {
      success = await runTest(finder);
    } else if (args.phase1) {
      success = await runPhase1(finder);
    } else if (args.auth) {
      success = await runAuthTest(finder);
    } else if (args.full) {
      success = await runFull(finder);
    } else {
      // No arguments - show help  
      console.log(`
⚠️  Please specify which step to run:

  --auth     Step 1: Test authentication
  --test     Step 2: Single search test  
  --phase1   Step 3: Priority combinations
  --full     Step 4: Complete search

Run --help for detailed information.
`);
      return;
    }

    if (!success) {
      logger.error('Search did not complete successfully');
      process.exit(1);
    }

    const duration = (Date.now() - startTime) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    logger.success(`\n✨ All done! Completed in ${minutes}m ${seconds.toFixed(0)}s`);

  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { PTFinder };
