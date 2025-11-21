#!/usr/bin/env tsx
/**
 * Query current sprint work items for Team AAS
 */

interface WorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.AssignedTo"?: { displayName: string };
    "System.WorkItemType": string;
    "Microsoft.VSTS.Scheduling.RemainingWork"?: number;
    "Microsoft.VSTS.Common.Priority"?: number;
    "System.Tags"?: string;
  };
}

async function getCurrentSprint(
  org: string,
  project: string,
  team: string,
  pat: string
) {
  const url = `https://dev.azure.com/${org}/${project}/${team}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get current sprint: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.value[0]; // Current sprint
}

async function getSprintWorkItems(
  org: string,
  project: string,
  team: string,
  sprintPath: string,
  pat: string
): Promise<WorkItem[]> {
  // Build WIQL query for current sprint
  const wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
           [System.WorkItemType], [Microsoft.VSTS.Scheduling.RemainingWork],
           [Microsoft.VSTS.Common.Priority], [System.Tags]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project}'
      AND [System.IterationPath] = '${sprintPath}'
    ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.State] ASC
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

  // Batch get work item details
  const idsParam = workItemIds.join(",");
  const fieldsParam = [
    "System.Id",
    "System.Title",
    "System.State",
    "System.AssignedTo",
    "System.WorkItemType",
    "Microsoft.VSTS.Scheduling.RemainingWork",
    "Microsoft.VSTS.Common.Priority",
    "System.Tags",
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
  return detailsData.value;
}

async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || "bofaz",
    project: process.env.AZURE_DEVOPS_PROJECT || "AAS",
    team: process.env.AZURE_DEVOPS_TEAM || "AAS",
    pat: process.env.AZURE_DEVOPS_PAT || "",
  };

  if (!config.pat) {
    console.error("❌ AZURE_DEVOPS_PAT environment variable is required");
    process.exit(1);
  }

  console.log("🔍 Querying current sprint for Team AAS...\n");
  console.log(`Organization: ${config.org}`);
  console.log(`Project: ${config.project}`);
  console.log(`Team: ${config.team}\n`);

  try {
    // Get current sprint
    const currentSprint = await getCurrentSprint(
      config.org,
      config.project,
      config.team,
      config.pat
    );

    console.log(`📅 Current Sprint: ${currentSprint.name}`);
    console.log(`   Path: ${currentSprint.path}`);
    console.log(`   Start: ${new Date(currentSprint.attributes.startDate).toLocaleDateString()}`);
    console.log(`   End: ${new Date(currentSprint.attributes.finishDate).toLocaleDateString()}\n`);

    // Get work items in current sprint
    const workItems = await getSprintWorkItems(
      config.org,
      config.project,
      config.team,
      currentSprint.path,
      config.pat
    );

    console.log(`📊 Found ${workItems.length} work items in current sprint:\n`);

    if (workItems.length === 0) {
      console.log("   No work items found in current sprint.");
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
      console.log(`\n${state.toUpperCase()} (${items.length})`);
      console.log("─".repeat(80));

      items.forEach((wi) => {
        const assignedTo = wi.fields["System.AssignedTo"]?.displayName || "Unassigned";
        const priority = wi.fields["Microsoft.VSTS.Common.Priority"] || "N/A";
        const remaining = wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"];
        const tags = wi.fields["System.Tags"] || "";

        console.log(`  [${wi.id}] ${wi.fields["System.WorkItemType"]}`);
        console.log(`    Title: ${wi.fields["System.Title"]}`);
        console.log(`    Assigned: ${assignedTo} | Priority: ${priority}${remaining ? ` | Remaining: ${remaining}h` : ""}`);
        if (tags) console.log(`    Tags: ${tags}`);
        console.log();
      });
    }

    // Summary
    console.log("\n" + "═".repeat(80));
    console.log("SUMMARY");
    console.log("═".repeat(80));
    console.log(`Total work items: ${workItems.length}`);
    for (const [state, items] of Object.entries(byState)) {
      console.log(`  ${state}: ${items.length}`);
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
