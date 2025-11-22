/**
 * Work Item History Collection Module
 * Fetches and analyzes work item updates from Azure DevOps
 * Integrated into team-performance-analysis unified skill
 */

import { adoRequest, getAdoConfig } from "../ado/ado-client.js";
import { parseTeamMembers, getTeamMemberNames } from "../../../shared/utils/toon-parser.js";
import * as fs from "fs";
import * as path from "path";
import { Result, Ok, Err } from "./result.js";

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

interface CollectionOptions {
  workItemIds: number[];
  outputDir: string;
  teamMembersFile?: string;
  focusMonths?: string[];
  rateLimit?: {
    progressInterval?: number;
    delayInterval?: number;
    delayMs?: number;
  };
  verbose?: boolean;
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
 * Collect work item history from Azure DevOps
 * Returns Result type: Ok(analysisFilePath) on success, Err(Error) on failure
 */
export async function collectWorkItemHistory(
  options: CollectionOptions
): Promise<Result<string>> {
  const verbose = options.verbose !== false;
  const progressInterval = options.rateLimit?.progressInterval || 20;
  const delayInterval = options.rateLimit?.delayInterval || 50;
  const delayMs = options.rateLimit?.delayMs || 500;

  if (verbose) {
    console.log("\n============================================================");
    console.log("🔍 COLLECTING WORK ITEM HISTORY");
    console.log("============================================================\n");
  }

  try {
    const config = getAdoConfig();
    if (verbose) {
      console.log(`✓ Configuration loaded:`);
      console.log(`  Organization: ${config.organization}`);
      console.log(`  Project: ${config.project}\n`);
    }

    // Create output directory
    try {
      if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true });
      }
    } catch (mkdirError) {
      return Err(
        new Error(
          `Failed to create output directory ${options.outputDir}: ${
            mkdirError instanceof Error ? mkdirError.message : String(mkdirError)
          }`
        )
      );
    }

    // Phase 1: Fetch updates for all work items
    if (verbose) {
      console.log("📝 Phase 1: Fetching Work Item Updates");
      console.log("-----------------------------------------------------------");
    }

    const allUpdates: WorkItemUpdate[] = [];
    let fetchedCount = 0;
    let errorCount = 0;

    for (const id of options.workItemIds) {
      try {
        const updates = await getWorkItemUpdates(id);

        // Add workItemId to each update
        updates.forEach(update => {
          update.workItemId = id;
        });

        allUpdates.push(...updates);
        fetchedCount++;

        if (verbose && fetchedCount % progressInterval === 0) {
          console.log(`   Progress: ${fetchedCount}/${options.workItemIds.length} (${(fetchedCount/options.workItemIds.length*100).toFixed(1)}%)`);
        }

        // Rate limiting
        if (fetchedCount % delayInterval === 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        errorCount++;
        if (verbose) {
          console.error(`   ✗ Error fetching updates for WI ${id}: ${error}`);
        }
      }
    }

    if (verbose) {
      console.log(`\n✓ Fetched updates for ${fetchedCount} work items`);
      console.log(`✓ Total update records: ${allUpdates.length}`);
      if (errorCount > 0) {
        console.log(`⚠️  Errors: ${errorCount}\n`);
      }
    }

    // Save all updates
    const updatesFile = path.join(options.outputDir, "all_work_item_updates.json");
    fs.writeFileSync(updatesFile, JSON.stringify(allUpdates, null, 2));
    if (verbose) {
      console.log(`💾 Saved to: ${updatesFile}\n`);
    }

    // Phase 2: Analyze patterns
    if (verbose) {
      console.log("📊 Phase 2: Analyzing Change Patterns");
      console.log("-----------------------------------------------------------");
    }

    const assignmentChanges = analyzeAssignmentChanges(allUpdates);
    const stateChanges = analyzeStateTransitions(allUpdates);
    const estimationChanges = analyzeEstimationChanges(allUpdates);
    const sprintChanges = analyzeSprintChanges(allUpdates);

    if (verbose) {
      console.log(`\n   Assignment changes: ${assignmentChanges.length}`);
      console.log(`   State transitions: ${stateChanges.length}`);
      console.log(`   Estimation changes: ${estimationChanges.length}`);
      console.log(`   Sprint changes: ${sprintChanges.length}\n`);
    }

    // Filter by focus months if provided
    let filteredAssignments = assignmentChanges;
    let filteredStates = stateChanges;
    let filteredEstimations = estimationChanges;
    let filteredSprints = sprintChanges;

    if (options.focusMonths && options.focusMonths.length > 0) {
      const focusFilter = (change: any) =>
        options.focusMonths!.some(month => change.date.startsWith(month));

      filteredAssignments = assignmentChanges.filter(focusFilter);
      filteredStates = stateChanges.filter(focusFilter);
      filteredEstimations = estimationChanges.filter(focusFilter);
      filteredSprints = sprintChanges.filter(focusFilter);

      if (verbose) {
        console.log(`   Focus months (${options.focusMonths.join(', ')}):`);
        console.log(`   • Assignment changes: ${filteredAssignments.length}`);
        console.log(`   • State transitions: ${filteredStates.length}`);
        console.log(`   • Estimation changes: ${filteredEstimations.length}`);
        console.log(`   • Sprint changes: ${filteredSprints.length}\n`);
      }
    }

    // Analyze team reassignments if team members file provided
    let reassignmentsFromTeam = [];
    let reassignmentsToTeam = [];
    let teamMembers: string[] = [];
    let teamName = process.env.TEAM_NAME || 'Team';

    if (options.teamMembersFile && fs.existsSync(options.teamMembersFile)) {
      if (verbose) {
        console.log(`\n   📄 Loading team members from: ${options.teamMembersFile}`);
      }
      try {
        const parsedMembers = parseTeamMembers(options.teamMembersFile);
        teamMembers = getTeamMemberNames(parsedMembers);
        if (verbose) {
          console.log(`   ✓ Loaded ${teamMembers.length} team members from TOON file`);
        }

        reassignmentsFromTeam = filteredAssignments.filter(change =>
          teamMembers.some(member => change.from.includes(member)) &&
          !teamMembers.some(member => change.to.includes(member))
        );

        reassignmentsToTeam = filteredAssignments.filter(change =>
          teamMembers.some(member => change.to.includes(member)) &&
          !teamMembers.some(member => change.from.includes(member)) &&
          change.from !== 'Unassigned'
        );

        if (verbose) {
          console.log(`\n   🔍 Analyzing reassignments for team: ${teamName}`);
          console.log(`   Team members: ${teamMembers.join(', ')}\n`);
          console.log(`   🚨 Reassignments FROM ${teamName} to others: ${reassignmentsFromTeam.length}`);
          if (reassignmentsFromTeam.length > 0) {
            console.log(`\n   Details:`);
            reassignmentsFromTeam.slice(0, 5).forEach(change => {
              console.log(`      WI #${change.workItemId} | ${change.date.substring(0, 10)} | ${change.from} → ${change.to}`);
            });
          }

          console.log(`\n   📥 Reassignments TO ${teamName} from others: ${reassignmentsToTeam.length}`);
          if (reassignmentsToTeam.length > 0) {
            console.log(`\n   Details:`);
            reassignmentsToTeam.slice(0, 5).forEach(change => {
              console.log(`      WI #${change.workItemId} | ${change.date.substring(0, 10)} | ${change.from} → ${change.to}`);
            });
          }
        }
      } catch (error) {
        if (verbose) {
          console.warn(`   ⚠️  Could not parse team members file: ${error}`);
        }
      }
    }

    // Save analysis results
    const analysis = {
      metadata: {
        team_name: teamName,
        team_members: teamMembers,
        analysis_date: new Date().toISOString(),
        focus_months: options.focusMonths
      },
      summary: {
        total_updates: allUpdates.length,
        assignment_changes: assignmentChanges.length,
        state_transitions: stateChanges.length,
        estimation_changes: estimationChanges.length,
        sprint_changes: sprintChanges.length
      },
      filtered: {
        assignment_changes: filteredAssignments.length,
        state_transitions: filteredStates.length,
        estimation_changes: filteredEstimations.length,
        sprint_changes: filteredSprints.length,
        reassignments_from_team: reassignmentsFromTeam.length,
        reassignments_to_team: reassignmentsToTeam.length
      },
      details: {
        assignment_changes: filteredAssignments,
        state_transitions: filteredStates,
        estimation_changes: filteredEstimations,
        sprint_changes: filteredSprints,
        reassignments_from_team: reassignmentsFromTeam,
        reassignments_to_team: reassignmentsToTeam
      }
    };

    const analysisFile = path.join(options.outputDir, "change_analysis.json");

    try {
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    } catch (writeError) {
      return Err(
        new Error(
          `Failed to save analysis file: ${
            writeError instanceof Error ? writeError.message : String(writeError)
          }`
        )
      );
    }

    if (verbose) {
      console.log(`\n💾 Analysis saved to: ${analysisFile}`);
      console.log("\n============================================================");
      console.log("✅ WORK ITEM HISTORY COLLECTION COMPLETE!");
      console.log("============================================================\n");
    }

    return Ok(analysisFile);

  } catch (error) {
    if (verbose) {
      console.error("\n❌ Error:", error);
    }
    return Err(
      new Error(
        `Work item history collection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }
}

/**
 * Helper: Get work item history file path
 */
export function getHistoryDataPath(outputDir: string): string {
  return path.join(outputDir, "all_work_item_updates.json");
}

/**
 * Helper: Check if history data exists
 */
export function hasHistoryData(historyDir: string): boolean {
  try {
    const historyFile = getHistoryDataPath(historyDir);
    return fs.existsSync(historyFile);
  } catch {
    return false;
  }
}
