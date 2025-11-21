#!/usr/bin/env tsx
/**
 * List all teams and projects in the Azure DevOps organization
 */

async function listProjects(org: string, pat: string) {
  const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.value;
}

async function listTeams(org: string, project: string, pat: string) {
  const url = `https://dev.azure.com/${org}/_apis/projects/${project}/teams?api-version=7.1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list teams: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.value;
}

async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || "bofaz",
    pat: process.env.AZURE_DEVOPS_PAT || "",
  };

  if (!config.pat) {
    console.error("❌ AZURE_DEVOPS_PAT environment variable is required");
    process.exit(1);
  }

  console.log(`🔍 Discovering projects and teams in organization: ${config.org}\n`);

  try {
    // List all projects
    const projects = await listProjects(config.org, config.pat);

    console.log(`📁 Found ${projects.length} projects:\n`);

    for (const project of projects) {
      console.log(`\n${"═".repeat(80)}`);
      console.log(`PROJECT: ${project.name}`);
      console.log(`  ID: ${project.id}`);
      console.log(`  Description: ${project.description || "N/A"}`);
      console.log(`${"═".repeat(80)}`);

      // List teams in this project
      try {
        const teams = await listTeams(config.org, project.name, config.pat);
        console.log(`\n  Teams (${teams.length}):`);

        teams.forEach((team: any) => {
          console.log(`    • ${team.name} (ID: ${team.id})`);
          if (team.description) console.log(`      Description: ${team.description}`);
        });
      } catch (error) {
        console.log(`    ⚠️  Could not list teams: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Look for AAS specifically
    console.log(`\n\n${"═".repeat(80)}`);
    console.log("🔎 SEARCHING FOR 'AAS'");
    console.log(`${"═".repeat(80)}\n`);

    let found = false;
    for (const project of projects) {
      if (project.name.toLowerCase().includes("aas")) {
        console.log(`✓ Found project matching 'AAS': ${project.name} (${project.id})`);
        found = true;
      }

      try {
        const teams = await listTeams(config.org, project.name, config.pat);
        teams.forEach((team: any) => {
          if (team.name.toLowerCase().includes("aas")) {
            console.log(`✓ Found team matching 'AAS': ${team.name} in project ${project.name}`);
            console.log(`  Use: Project="${project.name}", Team="${team.name}"`);
            found = true;
          }
        });
      } catch (error) {
        // Skip teams we can't access
      }
    }

    if (!found) {
      console.log("❌ No projects or teams found matching 'AAS'");
      console.log("\nPlease review the list above and identify the correct project/team.");
    }

  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
