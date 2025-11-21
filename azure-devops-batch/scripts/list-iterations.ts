#!/usr/bin/env tsx
/**
 * List all iterations for Team AAS to find the active sprint
 */

async function listIterations(
  org: string,
  project: string,
  team: string,
  pat: string
) {
  const url = `https://dev.azure.com/${org}/${project}/${team}/_apis/work/teamsettings/iterations?api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get iterations: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.value;
}

async function getWorkItemsCount(
  org: string,
  project: string,
  sprintPath: string,
  pat: string
): Promise<number> {
  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project}'
      AND [System.IterationPath] UNDER '${sprintPath}'
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
    return 0;
  }

  const queryData = await queryResponse.json();
  return queryData.workItems?.length || 0;
}

async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || "bofaz",
    project: process.env.AZURE_DEVOPS_PROJECT || "AAS",
    team: process.env.AZURE_DEVOPS_TEAM || "AAS Team",
    pat: process.env.AZURE_DEVOPS_PAT || "",
  };

  if (!config.pat) {
    console.error("❌ AZURE_DEVOPS_PAT environment variable is required");
    process.exit(1);
  }

  console.log("🔍 Listing all iterations for Team AAS...\n");
  console.log(`Organization: ${config.org}`);
  console.log(`Project: ${config.project}`);
  console.log(`Team: ${config.team}\n`);

  try {
    const iterations = await listIterations(
      config.org,
      config.project,
      config.team,
      config.pat
    );

    console.log(`📅 Found ${iterations.length} iterations:\n`);

    const now = new Date();

    // Sort by start date descending (most recent first)
    iterations.sort((a: any, b: any) => {
      const dateA = new Date(a.attributes.startDate);
      const dateB = new Date(b.attributes.startDate);
      return dateB.getTime() - dateA.getTime();
    });

    let currentSprint = null;

    for (const iteration of iterations) {
      const startDate = new Date(iteration.attributes.startDate);
      const finishDate = new Date(iteration.attributes.finishDate);
      const isActive = now >= startDate && now <= finishDate;
      const isFuture = now < startDate;

      let status = "Past";
      if (isActive) {
        status = "🟢 CURRENT";
        currentSprint = iteration;
      } else if (isFuture) {
        status = "🔵 Future";
      }

      // Get work item count
      const count = await getWorkItemsCount(
        config.org,
        config.project,
        iteration.path,
        config.pat
      );

      console.log(`${status.padEnd(12)} | ${iteration.name}`);
      console.log(`               Path: ${iteration.path}`);
      console.log(`               Dates: ${startDate.toLocaleDateString()} - ${finishDate.toLocaleDateString()}`);
      console.log(`               Work Items: ${count}`);
      console.log();
    }

    if (currentSprint) {
      console.log(`\n${"═".repeat(80)}`);
      console.log("✓ IDENTIFIED CURRENT SPRINT:");
      console.log(`  ${currentSprint.name}`);
      console.log(`  ${currentSprint.path}`);
      console.log(`${"═".repeat(80)}`);
    } else {
      console.log(`\n${"═".repeat(80)}`);
      console.log("⚠️  NO ACTIVE SPRINT FOUND");
      console.log("The team may not have an active sprint configured.");
      console.log(`${"═".repeat(80)}`);

      // Show the most recent sprint
      if (iterations.length > 0) {
        const mostRecent = iterations[0];
        console.log(`\n💡 Most recent sprint: ${mostRecent.name}`);
        console.log(`   Would you like to query this sprint instead?`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
