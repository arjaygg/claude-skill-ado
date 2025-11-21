#!/usr/bin/env node
/**
 * Check Work Items in Specific Sprints
 *
 * This script checks for work items in the configured sprints.
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
    'System.CreatedDate'?: string;
    'System.ChangedDate'?: string;
  };
}

async function getWorkItemsInSprint(
  sprintPath: string,
  config: { org: string; project: string; pat: string },
  exactMatch: boolean = true
): Promise<WorkItem[]> {
  // Use exact match or UNDER for hierarchical match
  const pathCondition = exactMatch
    ? `[System.IterationPath] = '${sprintPath}'`
    : `[System.IterationPath] UNDER '${sprintPath}'`;

  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE ${pathCondition}
    ORDER BY [System.ChangedDate] DESC
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
      const errorText = await queryResponse.text();
      console.error(`Query failed for ${sprintPath}: ${errorText}`);
      return [];
    }

    const queryData = await queryResponse.json();
    const workItemIds = queryData.workItems.map((wi: any) => wi.id);

    if (workItemIds.length === 0) {
      return [];
    }

    console.log(`  Found ${workItemIds.length} work items in ${sprintPath}`);

    const fields = [
      'System.Id',
      'System.Title',
      'System.State',
      'System.WorkItemType',
      'System.AssignedTo',
      'System.IterationPath',
      'Microsoft.VSTS.Common.Priority',
      'System.CreatedDate',
      'System.ChangedDate',
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
    console.error(`Error getting work items for ${sprintPath}:`, error);
    return [];
  }
}

function displayWorkItems(workItems: WorkItem[], sprintPath: string) {
  console.log('\n' + '='.repeat(100));
  console.log(`SPRINT: ${sprintPath}`);
  console.log(`Total Work Items: ${workItems.length}`);
  console.log('='.repeat(100));

  if (workItems.length === 0) {
    console.log('No work items found.\n');
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
  console.log('\nSummary by Type:');
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

  console.log('\n' + '='.repeat(100));

  // Display detailed list
  Object.entries(groupedByType).forEach(([type, items]) => {
    console.log(`\n${type}s (${items.length}):`);
    console.log('─'.repeat(100));

    items.forEach((wi) => {
      const assignedTo = wi.fields['System.AssignedTo']?.displayName || 'Unassigned';
      const priority = wi.fields['Microsoft.VSTS.Common.Priority'] || 'N/A';
      const state = wi.fields['System.State'];
      const title = wi.fields['System.Title'];
      const changedDate = wi.fields['System.ChangedDate']
        ? new Date(wi.fields['System.ChangedDate']).toLocaleDateString()
        : 'N/A';

      console.log(`[${wi.id}] ${title}`);
      console.log(`    State: ${state} | Priority: ${priority} | Assigned: ${assignedTo} | Changed: ${changedDate}`);
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

  // Check the future sprints (Sprint 1-4)
  const sprintsToCheck = [
    'AAS\\Sprint 1',
    'AAS\\Sprint 2',
    'AAS\\Sprint 3',
    'AAS\\Sprint 4',
  ];

  console.log('Checking work items in future sprints...\n');

  for (const sprintPath of sprintsToCheck) {
    console.log(`Checking: ${sprintPath}`);
    const workItems = await getWorkItemsInSprint(sprintPath, config, true);

    if (workItems.length > 0) {
      displayWorkItems(workItems, sprintPath);
    } else {
      console.log(`  No work items found in ${sprintPath}\n`);
    }
  }

  // Also try to get the most recently modified work items in the entire project
  console.log('\n' + '='.repeat(100));
  console.log('RECENTLY MODIFIED WORK ITEMS (Last 50)');
  console.log('='.repeat(100));

  const recentWiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = '${config.project}'
    ORDER BY [System.ChangedDate] DESC
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
        body: JSON.stringify({ query: recentWiql }),
      }
    );

    if (!queryResponse.ok) {
      console.error(`Query failed: ${await queryResponse.text()}`);
    } else {
      const queryData = await queryResponse.json();
      // Take only the first 50 work items
      const workItemIds = queryData.workItems.map((wi: any) => wi.id).slice(0, 50);

      if (workItemIds.length > 0) {
        console.log(`\nFetching details for ${workItemIds.length} most recent work items...\n`);
        const fields = [
          'System.Id',
          'System.Title',
          'System.State',
          'System.WorkItemType',
          'System.AssignedTo',
          'System.IterationPath',
          'Microsoft.VSTS.Common.Priority',
          'System.CreatedDate',
          'System.ChangedDate',
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

        if (response.ok) {
          const data = await response.json();
          displayWorkItems(data.value, 'Recent Work Items');
        }
      }
    }
  } catch (error) {
    console.error('Error getting recent work items:', error);
  }
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { getWorkItemsInSprint };
