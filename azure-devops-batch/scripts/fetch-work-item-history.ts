#!/usr/bin/env node
/**
 * Fetch Work Item Updates and Revisions for Forensic Analysis
 *
 * This script fetches:
 * - Work item updates (all changes including field changes, assignments, state transitions)
 * - Work item revisions (snapshots of work items at each revision)
 * - Analyzes patterns for reassignments, estimation changes, sprint changes
 */

import { adoRequest, getAdoConfig } from "./ado-client.js";
import * as fs from "fs";
import * as path from "path";

interface WorkItemUpdate {
  id: number;
  rev: number;
  fields: Record<string, { oldValue: any; newValue: any }>;
  revisedBy: { displayName: string; uniqueName: string };
  revisedDate: string;
  workItemId: number;
}

interface WorkItemRevision {
  id: number;
  rev: number;
  fields: Record<string, any>;
}

/**
 * Fetch all updates for a work item
 */
async function getWorkItemUpdates(workItemId: number): Promise<WorkItemUpdate[]> {
  const config = getAdoConfig();
  const endpoint = `/${config.project}/_apis/wit/workitems/${workItemId}/updates?api-version=${config.apiVersion}`;

  const result = await adoRequest<{ value: WorkItemUpdate[] }>(endpoint);
  return result.value || [];
}

/**
 * Fetch all revisions for a work item
 */
async function getWorkItemRevisions(workItemId: number): Promise<WorkItemRevision[]> {
  const config = getAdoConfig();
  const endpoint = `/${config.project}/_apis/wit/workitems/${workItemId}/revisions?api-version=${config.apiVersion}`;

  const result = await adoRequest<{ value: WorkItemRevision[] }>(endpoint);
  return result.value || [];
}

/**
 * Analyze assignment changes from updates
 */
function analyzeAssignmentChanges(allUpdates: WorkItemUpdate[]) {
  const assignmentChanges: any[] = [];

  for (const update of allUpdates) {
    if (update.fields && update.fields["System.AssignedTo"]) {
      const change = update.fields["System.AssignedTo"];
      assignmentChanges.push({
        workItemId: update.workItemId,
        date: update.revisedDate,
        changedBy: update.revisedBy.displayName,
        from: typeof change.oldValue === 'string' ? change.oldValue : change.oldValue?.displayName || 'Unassigned',
        to: typeof change.newValue === 'string' ? change.newValue : change.newValue?.displayName || 'Unassigned',
        rev: update.rev
      });
    }
  }

  return assignmentChanges;
}

/**
 * Analyze state transitions
 */
function analyzeStateTransitions(allUpdates: WorkItemUpdate[]) {
  const stateChanges: any[] = [];

  for (const update of allUpdates) {
    if (update.fields && update.fields["System.State"]) {
      const change = update.fields["System.State"];
      stateChanges.push({
        workItemId: update.workItemId,
        date: update.revisedDate,
        changedBy: update.revisedBy.displayName,
        from: change.oldValue,
        to: change.newValue,
        rev: update.rev
      });
    }
  }

  return stateChanges;
}

/**
 * Analyze estimation changes
 */
function analyzeEstimationChanges(allUpdates: WorkItemUpdate[]) {
  const estimationChanges: any[] = [];

  const estimationFields = [
    'Custom.HourEstimate',
    'Custom.QAHourEstimate',
    'Microsoft.VSTS.Scheduling.OriginalEstimate',
    'Microsoft.VSTS.Scheduling.RemainingWork',
    'Microsoft.VSTS.Scheduling.CompletedWork'
  ];

  for (const update of allUpdates) {
    if (!update.fields) continue;

    for (const field of estimationFields) {
      if (update.fields[field]) {
        const change = update.fields[field];
        estimationChanges.push({
          workItemId: update.workItemId,
          date: update.revisedDate,
          changedBy: update.revisedBy.displayName,
          field: field,
          from: change.oldValue,
          to: change.newValue,
          rev: update.rev
        });
      }
    }
  }

  return estimationChanges;
}

/**
 * Analyze sprint/iteration changes
 */
function analyzeSprintChanges(allUpdates: WorkItemUpdate[]) {
  const sprintChanges: any[] = [];

  for (const update of allUpdates) {
    if (update.fields && update.fields["System.IterationPath"]) {
      const change = update.fields["System.IterationPath"];
      sprintChanges.push({
        workItemId: update.workItemId,
        date: update.revisedDate,
        changedBy: update.revisedBy.displayName,
        from: change.oldValue,
        to: change.newValue,
        rev: update.rev
      });
    }
  }

  return sprintChanges;
}

/**
 * Main execution
 */
async function main() {
  console.log("============================================================");
  console.log("🔍 WORK ITEM HISTORY FETCH - FORENSIC ANALYSIS");
  console.log("============================================================\n");

  try {
    const config = getAdoConfig();
    console.log(`✓ Configuration loaded:`);
    console.log(`  Organization: ${config.organization}`);
    console.log(`  Project: ${config.project}\n`);

    // Load work item IDs from existing data
    const dataFile = path.join(process.cwd(), "data/july_november_2025/all_work_items_july_november_2025.json");

    if (!fs.existsSync(dataFile)) {
      throw new Error(`Data file not found: ${dataFile}`);
    }

    console.log(`📂 Loading work items from: ${dataFile}`);
    const workItems = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    const workItemIds = workItems.map((wi: any) => wi.id);

    console.log(`✓ Found ${workItemIds.length} work items\n`);

    // Create output directory
    const outputDir = path.join(process.cwd(), "data/july_november_2025/history_detailed");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Phase 1: Fetch updates for all work items
    console.log("📝 Phase 1: Fetching Work Item Updates");
    console.log("-----------------------------------------------------------");

    const allUpdates: WorkItemUpdate[] = [];
    let fetchedCount = 0;
    let errorCount = 0;

    for (const id of workItemIds) {
      try {
        const updates = await getWorkItemUpdates(id);

        // Add workItemId to each update
        updates.forEach(update => {
          update.workItemId = id;
        });

        allUpdates.push(...updates);
        fetchedCount++;

        if (fetchedCount % 20 === 0) {
          console.log(`   Progress: ${fetchedCount}/${workItemIds.length} (${(fetchedCount/workItemIds.length*100).toFixed(1)}%)`);
        }

        // Rate limiting
        if (fetchedCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Error fetching updates for WI ${id}: ${error}`);
      }
    }

    console.log(`\n✓ Fetched updates for ${fetchedCount} work items`);
    console.log(`✓ Total update records: ${allUpdates.length}`);
    if (errorCount > 0) {
      console.log(`⚠️  Errors: ${errorCount}\n`);
    }

    // Save all updates
    const updatesFile = path.join(outputDir, "all_work_item_updates.json");
    fs.writeFileSync(updatesFile, JSON.stringify(allUpdates, null, 2));
    console.log(`💾 Saved to: ${updatesFile}\n`);

    // Phase 2: Analyze patterns
    console.log("📊 Phase 2: Analyzing Change Patterns");
    console.log("-----------------------------------------------------------");

    const assignmentChanges = analyzeAssignmentChanges(allUpdates);
    const stateChanges = analyzeStateTransitions(allUpdates);
    const estimationChanges = analyzeEstimationChanges(allUpdates);
    const sprintChanges = analyzeSprintChanges(allUpdates);

    console.log(`\n   Assignment changes: ${assignmentChanges.length}`);
    console.log(`   State transitions: ${stateChanges.length}`);
    console.log(`   Estimation changes: ${estimationChanges.length}`);
    console.log(`   Sprint changes: ${sprintChanges.length}\n`);

    // Filter for October-November changes
    const octNovFilter = (change: any) =>
      change.date.startsWith('2025-10') || change.date.startsWith('2025-11');

    const octNovAssignments = assignmentChanges.filter(octNovFilter);
    const octNovStates = stateChanges.filter(octNovFilter);
    const octNovEstimations = estimationChanges.filter(octNovFilter);
    const octNovSprints = sprintChanges.filter(octNovFilter);

    console.log(`   October-November focus:`);
    console.log(`   • Assignment changes: ${octNovAssignments.length}`);
    console.log(`   • State transitions: ${octNovStates.length}`);
    console.log(`   • Estimation changes: ${octNovEstimations.length}`);
    console.log(`   • Sprint changes: ${octNovSprints.length}\n`);

    // Load team members from environment variable or use defaults
    // Format: "Member Name,Member Name2" (comma-separated)
    const teamMembersEnv = process.env.TEAM_MEMBERS || 'Jude Marco Bayot,Christopher Reyes,James Aaron Constantino,Erwin Biglang-awa';
    const teamMembers = teamMembersEnv.split(',').map(m => m.trim());
    const teamName = process.env.TEAM_NAME || 'ABC';

    console.log(`\n   🔍 Analyzing reassignments for team: ${teamName}`);
    console.log(`   Team members: ${teamMembers.join(', ')}\n`);

    const reassignmentsFromTeam = octNovAssignments.filter(change =>
      teamMembers.some(member => change.from.includes(member)) &&
      !teamMembers.some(member => change.to.includes(member))
    );

    const reassignmentsToTeam = octNovAssignments.filter(change =>
      teamMembers.some(member => change.to.includes(member)) &&
      !teamMembers.some(member => change.from.includes(member)) &&
      change.from !== 'Unassigned'
    );

    console.log(`   🚨 Reassignments FROM ${teamName} team to others: ${reassignmentsFromTeam.length}`);
    if (reassignmentsFromTeam.length > 0) {
      console.log(`\n   Details:`);
      reassignmentsFromTeam.slice(0, 10).forEach(change => {
        console.log(`      WI #${change.workItemId} | ${change.date.substring(0, 10)} | ${change.from} → ${change.to}`);
      });
    }

    console.log(`\n   📥 Reassignments TO ${teamName} team from others: ${reassignmentsToTeam.length}`);
    if (reassignmentsToTeam.length > 0) {
      console.log(`\n   Details:`);
      reassignmentsToTeam.slice(0, 10).forEach(change => {
        console.log(`      WI #${change.workItemId} | ${change.date.substring(0, 10)} | ${change.from} → ${change.to}`);
      });
    }

    // Save analysis results
    const analysis = {
      metadata: {
        team_name: teamName,
        team_members: teamMembers,
        analysis_date: new Date().toISOString()
      },
      summary: {
        total_updates: allUpdates.length,
        assignment_changes: assignmentChanges.length,
        state_transitions: stateChanges.length,
        estimation_changes: estimationChanges.length,
        sprint_changes: sprintChanges.length
      },
      october_november: {
        assignment_changes: octNovAssignments.length,
        state_transitions: octNovStates.length,
        estimation_changes: octNovEstimations.length,
        sprint_changes: octNovSprints.length,
        reassignments_from_team: reassignmentsFromTeam.length,
        reassignments_to_team: reassignmentsToTeam.length
      },
      details: {
        assignment_changes: assignmentChanges,
        state_transitions: stateChanges,
        estimation_changes: estimationChanges,
        sprint_changes: sprintChanges,
        reassignments_from_team: reassignmentsFromTeam,
        reassignments_to_team: reassignmentsToTeam
      }
    };

    const analysisFile = path.join(outputDir, "change_analysis.json");
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Analysis saved to: ${analysisFile}`);

    console.log("\n============================================================");
    console.log("✅ WORK ITEM HISTORY ANALYSIS COMPLETE!");
    console.log("============================================================\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
