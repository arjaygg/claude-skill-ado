#!/usr/bin/env node
/**
 * Get All Iterations and Work Items
 *
 * This script retrieves all iterations and their work items.
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

interface Iteration {
  id: string;
  name: string;
  path: string;
  attributes: {
    startDate?: string;
    finishDate?: string;
    timeFrame?: string;
  };
}

async function getAllIterations(
  config: { org: string; project: string; pat: string }
): Promise<Iteration[]> {
  try {
    const response = await fetch(
      `https://dev.azure.com/${config.org}/${config.project}/_apis/work/teamsettings/iterations?api-version=7.1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to get iterations: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('Error getting iterations:', error);
    return [];
  }
}

async function getWorkItemsInSprint(
  sprintPath: string,
  config: { org: string; project: string; pat: string }
): Promise<WorkItem[]> {
  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.IterationPath] UNDER '${sprintPath}'
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
      return [];
    }

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

function displayWorkItems(workItems: WorkItem[], sprintPath: string, sprintName: string) {
  console.log('\n===========================================');
  console.log(`Sprint: ${sprintName}`);
  console.log(`Path: ${sprintPath}`);
  console.log(`Total Work Items: ${workItems.length}`);
  console.log('===========================================\n');

  if (workItems.length === 0) {
    console.log('No work items found in this sprint.\n');
    return;
  }

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

  console.log('Fetching all iterations...');

  const iterations = await getAllIterations(config);

  if (iterations.length === 0) {
    console.error('No iterations found.');
    process.exit(1);
  }

  console.log(`\nFound ${iterations.length} iterations:\n`);

  // Display all iterations with their timeframes
  iterations.forEach((iter, index) => {
    const timeframe = iter.attributes.timeFrame || 'unknown';
    const start = iter.attributes.startDate
      ? new Date(iter.attributes.startDate).toLocaleDateString()
      : 'N/A';
    const finish = iter.attributes.finishDate
      ? new Date(iter.attributes.finishDate).toLocaleDateString()
      : 'N/A';

    const marker = timeframe === 'current' ? '★ ' : '  ';
    console.log(`${marker}[${index + 1}] ${iter.name}`);
    console.log(`   Timeframe: ${timeframe} | Start: ${start} | End: ${finish}`);
    console.log(`   Path: ${iter.path}`);
    console.log('');
  });

  // Find current iteration
  const currentIter = iterations.find((iter) => iter.attributes.timeFrame === 'current');

  if (currentIter) {
    console.log('\n===========================================');
    console.log('CURRENT SPRINT');
    console.log('===========================================');

    console.log('Fetching work items for current sprint...');
    const workItems = await getWorkItemsInSprint(currentIter.path, config);
    displayWorkItems(workItems, currentIter.path, currentIter.name);
  } else {
    console.log('\nNo current sprint found. Showing most recent iteration...');
    const recentIter = iterations[iterations.length - 1];
    console.log('Fetching work items for most recent sprint...');
    const workItems = await getWorkItemsInSprint(recentIter.path, config);
    displayWorkItems(workItems, recentIter.path, recentIter.name);
  }

  // Also try to get work items from the project root
  console.log('\n===========================================');
  console.log('ALL WORK ITEMS IN PROJECT');
  console.log('===========================================');

  const projectPath = config.project;
  console.log(`\nFetching all work items under project: ${projectPath}...`);
  const allWorkItems = await getWorkItemsInSprint(projectPath, config);
  displayWorkItems(allWorkItems, projectPath, 'All Project Work Items');
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { getAllIterations, getWorkItemsInSprint };
