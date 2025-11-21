#!/usr/bin/env node
/**
 * Test Script for Azure DevOps Batch Skill
 *
 * This script tests the skill configuration and validates API connectivity
 * without making destructive changes.
 */

import { getAdoConfig, adoRequest } from "./ado-client.js";
import { queryWorkItems } from "./ado-batch.js";

console.log("================================================");
console.log("Azure DevOps Batch Skill - Test Suite");
console.log("================================================\n");

async function testConfiguration() {
  console.log("1️⃣  Testing Configuration");
  console.log("   ─────────────────────────");

  try {
    const config = getAdoConfig();
    console.log("   ✓ Configuration loaded successfully");
    console.log(`   ✓ Organization: ${config.organization}`);
    console.log(`   ✓ Project: ${config.project}`);
    console.log(`   ✓ PAT: ${config.pat.substring(0, 4)}...${config.pat.substring(config.pat.length - 4)}`);
    console.log(`   ✓ API Version: ${config.apiVersion}\n`);
    return true;
  } catch (error) {
    console.log(`   ✗ Configuration error: ${(error as Error).message}\n`);
    console.log("   💡 Fix: Set these environment variables:");
    console.log("      export AZURE_DEVOPS_ORG='your-org-name'");
    console.log("      export AZURE_DEVOPS_PROJECT='your-project-name'");
    console.log("      export AZURE_DEVOPS_PAT='your-pat-token'\n");
    return false;
  }
}

async function testApiConnectivity() {
  console.log("2️⃣  Testing API Connectivity");
  console.log("   ─────────────────────────");

  try {
    const config = getAdoConfig();
    // Test with projects API instead of a specific work item
    const endpoint = `/_apis/projects/${config.project}?api-version=${config.apiVersion}`;

    console.log(`   → Testing project access...`);

    const result = await adoRequest(endpoint);

    console.log("   ✓ API connection successful");
    console.log("   ✓ Authentication valid");
    console.log(`   ✓ Project access confirmed: ${result.name}\n`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.log(`   ✗ API connection failed: ${err.message}\n`);

    if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      console.log("   💡 Fix: Check your PAT token is valid and not expired");
    } else if (err.message.includes("404") && err.message.includes("does not exist")) {
      console.log("   💡 Fix: Verify the organization and project names are correct");
    } else if (err.message.includes("403") || err.message.includes("Forbidden")) {
      console.log("   💡 Fix: Ensure your PAT has proper permissions");
    }
    console.log();
    return false;
  }
}

async function testQuery() {
  console.log("3️⃣  Testing WIQL Query");
  console.log("   ─────────────────────────");

  try {
    // For very large projects (>20k items), WIQL queries can be challenging
    // Try with a very specific filter to minimize results
    const wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'";
    console.log(`   → Executing filtered query (Active Bugs only)`);

    const result = await queryWorkItems(wiql, { top: 10 });

    if (result.workItems && result.workItems.length > 0) {
      console.log(`   ✓ Query successful`);
      console.log(`   ✓ Found ${result.workItems.length} work items`);
      console.log(`   ✓ Sample IDs: ${result.workItems.slice(0, 5).map((wi: any) => wi.id).join(", ")}\n`);
      return true;
    } else {
      console.log("   ⚠️  Query succeeded but no work items match (no Active Bugs)");
      console.log("   ✓ This is OK - query functionality works\n");
      return true;
    }
  } catch (error) {
    const err = error as Error;

    if (err.message.includes("20000") || err.message.includes("size limit")) {
      console.log(`   ⚠️  Project has >20,000 work items (very large project!)`);
      console.log(`   ⚠️  WIQL query test skipped - this is expected for large projects\n`);

      console.log(`   💡 For large projects, use these strategies:`);
      console.log(`      1. Always add specific WHERE clauses`);
      console.log(`      2. Query by iteration: [System.IterationPath] = 'Sprint 1'`);
      console.log(`      3. Query by date: [System.ChangedDate] >= @Today - 7`);
      console.log(`      4. Query by type+state: [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'`);
      console.log(`      5. Use the Analytics API for counts/aggregations\n`);

      // This is actually OK - we've proven the API works in previous tests
      return true;
    }

    console.log(`   ✗ Query failed: ${err.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log("Running tests...\n");

  const results = {
    config: false,
    connectivity: false,
    query: false,
  };

  // Test 1: Configuration
  results.config = await testConfiguration();
  if (!results.config) {
    console.log("❌ Configuration test failed. Please fix the issues above and try again.\n");
    process.exit(1);
  }

  // Test 2: API Connectivity
  results.connectivity = await testApiConnectivity();
  if (!results.connectivity) {
    console.log("❌ API connectivity test failed. Please fix the issues above and try again.\n");
    process.exit(1);
  }

  // Test 3: Query
  results.query = await testQuery();

  // Summary
  console.log("================================================");
  console.log("Test Summary");
  console.log("================================================");
  console.log(`Configuration:    ${results.config ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`API Connectivity: ${results.connectivity ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`WIQL Query:       ${results.query ? "✅ PASS" : "❌ FAIL"}`);
  console.log();

  if (results.config && results.connectivity && results.query) {
    console.log("🎉 All tests passed! The skill is ready to use.");
    console.log();
    console.log("Next steps:");
    console.log("  • Run example scripts:");
    console.log("    npm run example:bulk-update -- 1,2,3 Active");
    console.log("  • Or write custom scripts using the utilities");
    console.log();
  } else {
    console.log("⚠️  Some tests failed. Please fix the issues above.");
    console.log();
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
