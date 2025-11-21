#!/usr/bin/env node
/**
 * Get Work Items in Current Sprint
 *
 * This script retrieves all work items for the current sprint in the AAS project.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the skill's .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface WorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.State': string;
    'System.WorkItemType': string;
    'System.AssignedTo'?: { displayName: string };
    'System.IterationPath': string;
    'Microsoft.VSTS.Common.Priority'?: number;
  };
}

async function getCurrentIteration(
  config: { org: string; project: string; pat: string }
): Promise<string | null> {
  try {
    // Get the current iteration
    const response = await fetch(
      `https://dev.azure.com/${config.org}/${config.project}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to get current iteration: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.value && data.value.length > 0) {
      return data.value[0].path;
    }

    return null;
  } catch (error) {
    console.error('Error getting current iteration:', error);
    return null;
  }
}

async function getWorkItemsInSprint(
  sprintPath: string,
  config: { org: string; project: string; pat: string }
): Promise<WorkItem[]> {
  // Query all work items in the current sprint
  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.IterationPath] = '${sprintPath}'
    ORDER BY [System.WorkItemType], [Microsoft.VSTS.Common.Priority], [System.State]
  `;

  try {
    const queryResponse = await fetch(
      `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/wiql?api-version=7.1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: wiql }),
      }
    );

    if (!queryResponse.ok) {
      throw new Error(`Query failed: ${await queryResponse.text()}`);
    }

    const queryData = await queryResponse.json();
    const workItemIds = queryData.workItems.map((wi: any) => wi.id);

    if (workItemIds.length === 0) {
      console.log('No work items found in the current sprint.');
      return [];
    }

    // Get detailed information for all work items
    const fields = [
      'System.Id',
      'System.Title',
      'System.State',
      'System.WorkItemType',
      'System.AssignedTo',
      'System.IterationPath',
      'Microsoft.VSTS.Common.Priority',
    ];

    const idsParam = workItemIds.join(',');
    const fieldsParam = fields.join(',');

    const response = await fetch(
      `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems?ids=${idsParam}&fields=${fieldsParam}&api-version=7.1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get work items: ${await response.text()}`);
    }

    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error getting work items:', error);
    return [];
  }
}

function displayWorkItems(workItems: WorkItem[], sprintPath: string) {
  console.log('\n===========================================');
  console.log(`Current Sprint: ${sprintPath}`);
  console.log(`Total Work Items: ${workItems.length}`);
  console.log('===========================================\n');

  // Group by work item type
  const groupedByType = workItems.reduce((acc, wi) => {
    const type = wi.fields['System.WorkItemType'];
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(wi);
    return acc;
  }, {} as Record<string, WorkItem[]>);

  // Display summary
  console.log('Summary by Type:');
  Object.entries(groupedByType).forEach(([type, items]) => {
    const byState = items.reduce((acc, wi) => {
      const state = wi.fields['System.State'];
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`  ${type}: ${items.length} items`);
    Object.entries(byState).forEach(([state, count]) => {
      console.log(`    - ${state}: ${count}`);
    });
  });

  console.log('\n===========================================\n');

  // Display detailed list
  Object.entries(groupedByType).forEach(([type, items]) => {
    console.log(`\n${type}s (${items.length}):`);
    console.log('─'.repeat(80));

    items.forEach((wi) => {
      const assignedTo = wi.fields['System.AssignedTo']?.displayName || 'Unassigned';
      const priority = wi.fields['Microsoft.VSTS.Common.Priority'] || 'N/A';
      const state = wi.fields['System.State'];
      const title = wi.fields['System.Title'];

      console.log(`[${wi.id}] ${title}`);
      console.log(`    State: ${state} | Priority: ${priority} | Assigned: ${assignedTo}`);
      console.log('');
    });
  });
}

async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || '',
    project: process.env.AZURE_DEVOPS_PROJECT || '',
    pat: process.env.AZURE_DEVOPS_PAT || '',
  };

  if (!config.org || !config.project || !config.pat) {
    console.error('Missing environment variables:');
    console.error('  AZURE_DEVOPS_ORG');
    console.error('  AZURE_DEVOPS_PROJECT');
    console.error('  AZURE_DEVOPS_PAT');
    process.exit(1);
  }

  console.log('Fetching current sprint information...');

  // Get current iteration
  const currentIteration = await getCurrentIteration(config);

  if (!currentIteration) {
    console.error('Could not find current iteration. Make sure your team has an active sprint.');
    process.exit(1);
  }

  console.log(`Current iteration: ${currentIteration}`);
  console.log('Fetching work items...');

  // Get all work items in the current sprint
  const workItems = await getWorkItemsInSprint(currentIteration, config);

  // Display results
  displayWorkItems(workItems, currentIteration);
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { getCurrentIteration, getWorkItemsInSprint };
