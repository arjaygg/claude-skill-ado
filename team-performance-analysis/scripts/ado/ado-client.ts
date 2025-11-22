/**
 * Azure DevOps API Client
 * Core client for making authenticated requests to Azure DevOps REST APIs
 */

export interface AdoConfig {
  organization: string;
  project: string;
  pat: string;
  apiVersion?: string;
}

export interface AdoRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Get ADO configuration from environment variables
 */
export function getAdoConfig(): AdoConfig {
  // Try to load from .env file if variables not set
  if (!process.env.AZURE_DEVOPS_ORG) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach((line: string) => {
          const match = line.match(/^([^=:#]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
      }
    } catch (e) {
      // Ignore errors loading .env
    }
  }

  const organization = process.env.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  const pat = process.env.AZURE_DEVOPS_PAT;

  if (!organization || !project || !pat) {
    throw new Error(
      "Missing required environment variables: AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_PAT"
    );
  }

  return {
    organization,
    project,
    pat,
    apiVersion: "7.1",
  };
}

/**
 * Make an authenticated request to Azure DevOps REST API
 */
export async function adoRequest<T = any>(
  endpoint: string,
  options: AdoRequestOptions = {}
): Promise<T> {
  const config = getAdoConfig();
  const baseUrl = `https://dev.azure.com/${config.organization}`;
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const auth = Buffer.from(`:${config.pat}`).toString("base64");

  const headers: Record<string, string> = {
    "Authorization": `Basic ${auth}`,
    "Content-Type": "application/json-patch+json",
    "Accept": "application/json",
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ADO API Error (${response.status}): ${errorText}`
      );
    }

    // Handle empty responses (e.g., DELETE)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return {} as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call ADO API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(","));
      } else {
        searchParams.append(key, String(value));
      }
    }
  }

  return searchParams.toString();
}
