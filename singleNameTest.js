#!/usr/bin/env node

/**
 * Single Name Test - Test PT Finder with just one name
 */

const PTFinder = require('./lib/searcher');
const { logger } = require('./lib/utils');
const config = require('./config');

class SingleNameTester extends PTFinder {
  async testSingleName(nameToTest) {
    logger.section(`🧪 TESTING WITH SINGLE NAME: "${nameToTest}"`);
    
    if (!await this.initialize()) {
      logger.error('Failed to initialize');
      return false;
    }

    // Override names array AFTER initialization with just one name
    this.names = [nameToTest];

    logger.info(`Testing name: "${nameToTest}"`);
    logger.info(`Will search with case variations: ${nameToTest}, ${nameToTest.toLowerCase()}, ${nameToTest.toUpperCase()}`);

    // Run only Phase 1 (locations) for testing
    await this.phase1SearchNameLocations();
    
    const results = this.getResults();
    
    if (results.length > 0) {
      logger.success(`Found ${results.length} trainers with name "${nameToTest}":`);
      results.slice(0, 5).forEach((trainer, i) => {
        console.log(`  ${i+1}. @${trainer.username} - ${trainer.fullName} (${trainer.followers} followers)`);
        console.log(`     Bio: ${trainer.bio}`);
        console.log(`     Found via: ${trainer.searchKeyword}`);
        console.log('');
      });
    } else {
      logger.warning(`No trainers found for name "${nameToTest}"`);
    }

    // Export results
    this.exportResults(results);
    
    return results;
  }
}

async function main() {
  const testName = process.argv[2] || config.IG_USERNAME || 'Ahmed'; // Default to env username or Ahmed
  
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                        🧪 SINGLE NAME TEST                                 ║
║                                                                            ║
║  Testing PT Finder with ONE name only to see actual results              ║
║  Name: ${testName.padEnd(60)}  ║
║                                                                            ║
║  Search Type: FUZZY MATCHING (Instagram's search algorithm)               ║
║  - NOT exact match (==)                                                   ║
║  - Similar to SQL LIKE% - finds profiles that contain or relate to name   ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  const tester = new SingleNameTester();
  
  try {
    const results = await tester.testSingleName(testName);
    
    logger.section('📊 TEST RESULTS SUMMARY');
    console.log(`• Name tested: ${testName}`);
    console.log(`• Trainers found: ${results.length}`);
    console.log(`• Search type: FUZZY (LIKE%) - finds related profiles, not exact matches`);
    console.log(`• Output files: scraper_output/trainers_egypt_*.json/csv`);
    
    if (results.length > 0) {
      console.log(`\n✅ Success! Found trainers with "${testName}" in their profiles.`);
      console.log(`Instagram's search returned profiles that contain/relate to "${testName}"`);
    } else {
      console.log(`\n⚠️  No trainers found for "${testName}"`);
      console.log(`Try another name like: Hassan, Amr, Ali, Fatima, Sara`);
    }

  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
  }
}

if (require.main === module) {
  main();
}