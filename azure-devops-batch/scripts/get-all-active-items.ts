#!/usr/bin/env tsx
/**
 * Query all active work items for Team AAS (regardless of sprint)
 */

interface WorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.AssignedTo"?: { displayName: string };
    "System.WorkItemType": string;
    "System.IterationPath": string;
    "Microsoft.VSTS.Scheduling.RemainingWork"?: number;
    "Microsoft.VSTS.Common.Priority"?: number;
    "System.Tags"?: string;
    "System.CreatedDate"?: string;
    "System.ChangedDate"?: string;
  };
}

async function getActiveWorkItems(
  org: string,
  project: string,
  pat: string
): Promise<WorkItem[]> {
  // Query for all non-closed work items
  const wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
           [System.WorkItemType], [System.IterationPath],
           [Microsoft.VSTS.Scheduling.RemainingWork],
           [Microsoft.VSTS.Common.Priority], [System.Tags],
           [System.CreatedDate], [System.ChangedDate]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project}'
      AND [System.State] NOT IN ('Closed', 'Removed', 'Done', 'Resolved')
    ORDER BY [System.State] ASC, [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC
  `;

  const queryResponse = await fetch(
    `https://dev.azure.com/${org}/${project}/_apis/wit/wiql?api-version=7.1`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: wiql }),
    }
  );

  if (!queryResponse.ok) {
    throw new Error(`Query failed: ${queryResponse.status} ${await queryResponse.text()}`);
  }

  const queryData = await queryResponse.json();
  const workItemIds = queryData.workItems.map((wi: any) => wi.id);

  if (workItemIds.length === 0) {
    return [];
  }

  // Batch get work item details in chunks of 100 to avoid URL length limits
  const allWorkItems: WorkItem[] = [];
  const chunkSize = 100;

  for (let i = 0; i < workItemIds.length; i += chunkSize) {
    const chunk = workItemIds.slice(i, i + chunkSize);
    const idsParam = chunk.join(",");
    const fieldsParam = [
      "System.Id",
      "System.Title",
      "System.State",
      "System.AssignedTo",
      "System.WorkItemType",
      "System.IterationPath",
      "Microsoft.VSTS.Scheduling.RemainingWork",
      "Microsoft.VSTS.Common.Priority",
      "System.Tags",
      "System.CreatedDate",
      "System.ChangedDate",
    ].join(",");

    const detailsResponse = await fetch(
      `https://dev.azure.com/${org}/${project}/_apis/wit/workitems?ids=${idsParam}&fields=${fieldsParam}&api-version=7.1`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error(`Failed to get work item details: ${detailsResponse.status} ${await detailsResponse.text()}`);
    }

    const detailsData = await detailsResponse.json();
    allWorkItems.push(...detailsData.value);
  }

  return allWorkItems;
}

async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || "bofaz",
    project: process.env.AZURE_DEVOPS_PROJECT || "AAS",
    pat: process.env.AZURE_DEVOPS_PAT || "",
  };

  if (!config.pat) {
    console.error("❌ AZURE_DEVOPS_PAT environment variable is required");
    process.exit(1);
  }

  console.log("🔍 Querying all active work items for Team AAS...\n");
  console.log(`Organization: ${config.org}`);
  console.log(`Project: ${config.project}\n`);

  try {
    const workItems = await getActiveWorkItems(
      config.org,
      config.project,
      config.pat
    );

    console.log(`📊 Found ${workItems.length} active work items:\n`);

    if (workItems.length === 0) {
      console.log("   No active work items found.");
      return;
    }

    // Group by state
    const byState = workItems.reduce((acc, wi) => {
      const state = wi.fields["System.State"];
      if (!acc[state]) acc[state] = [];
      acc[state].push(wi);
      return acc;
    }, {} as Record<string, WorkItem[]>);

    // Display grouped by state
    for (const [state, items] of Object.entries(byState)) {
      console.log(`\n${"═".repeat(80)}`);
      console.log(`${state.toUpperCase()} (${items.length})`);
      console.log(`${"═".repeat(80)}`);

      items.forEach((wi) => {
        const assignedTo = wi.fields["System.AssignedTo"]?.displayName || "Unassigned";
        const priority = wi.fields["Microsoft.VSTS.Common.Priority"] || "N/A";
        const remaining = wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"];
        const tags = wi.fields["System.Tags"] || "";
        const iterationPath = wi.fields["System.IterationPath"] || "No Iteration";
        const changedDate = wi.fields["System.ChangedDate"]
          ? new Date(wi.fields["System.ChangedDate"]).toLocaleDateString()
          : "N/A";

        console.log(`\n  [${wi.id}] ${wi.fields["System.WorkItemType"]}`);
        console.log(`    Title: ${wi.fields["System.Title"]}`);
        console.log(`    Assigned: ${assignedTo} | Priority: ${priority}${remaining ? ` | Remaining: ${remaining}h` : ""}`);
        console.log(`    Iteration: ${iterationPath}`);
        console.log(`    Last Updated: ${changedDate}`);
        if (tags) console.log(`    Tags: ${tags}`);
      });

      console.log();
    }

    // Summary by work item type
    const byType = workItems.reduce((acc, wi) => {
      const type = wi.fields["System.WorkItemType"];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Summary by iteration
    const byIteration = workItems.reduce((acc, wi) => {
      const iteration = wi.fields["System.IterationPath"] || "No Iteration";
      acc[iteration] = (acc[iteration] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Summary by assignment
    const byAssignment = workItems.reduce((acc, wi) => {
      const assignedTo = wi.fields["System.AssignedTo"]?.displayName || "Unassigned";
      acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n" + "═".repeat(80));
    console.log("SUMMARY");
    console.log("═".repeat(80));
    console.log(`\nTotal active work items: ${workItems.length}\n`);

    console.log("By State:");
    for (const [state, items] of Object.entries(byState)) {
      console.log(`  ${state}: ${items.length}`);
    }

    console.log("\nBy Type:");
    for (const [type, count] of Object.entries(byType)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log("\nBy Iteration:");
    for (const [iteration, count] of Object.entries(byIteration)) {
      console.log(`  ${iteration}: ${count}`);
    }

    console.log("\nBy Assignment:");
    const sortedAssignments = Object.entries(byAssignment)
      .sort(([, a], [, b]) => b - a);
    for (const [assignee, count] of sortedAssignments) {
      console.log(`  ${assignee}: ${count}`);
    }

    const totalRemaining = workItems.reduce((sum, wi) => {
      return sum + (wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"] || 0);
    }, 0);

    if (totalRemaining > 0) {
      console.log(`\nTotal remaining work: ${totalRemaining} hours`);
    }

  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
