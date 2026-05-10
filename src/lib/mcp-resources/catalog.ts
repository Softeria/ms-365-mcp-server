/**
 * Static MCP resource catalog manifest.
 *
 * This file is intentionally limited to deterministic metadata. Resource
 * registration and read dispatch are owned by the later MCP resources plan.
 */

export const MARKDOWN_MIME_TYPE = 'text/markdown';

export const WORKLOAD_GUIDE_SLUGS = [
  'mail',
  'calendar',
  'teams',
  'files',
  'sharepoint',
  'users',
  'groups',
  'meetings',
  'presence',
  'virtual-events',
] as const;

export type WorkloadGuideSlug = (typeof WORKLOAD_GUIDE_SLUGS)[number];

export interface StaticCatalogResource {
  readonly uri: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly mimeType: typeof MARKDOWN_MIME_TYPE;
  readonly resourcePath: string;
}

export interface WorkloadGuideResource extends StaticCatalogResource {
  readonly slug: WorkloadGuideSlug;
}

interface WorkloadGuideDefinition {
  readonly slug: WorkloadGuideSlug;
  readonly title: string;
  readonly description: string;
}

const WORKLOAD_GUIDE_DEFINITIONS: readonly WorkloadGuideDefinition[] = Object.freeze([
  {
    slug: 'mail',
    title: 'Mail Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph mail tools.',
  },
  {
    slug: 'calendar',
    title: 'Calendar Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph calendar tools.',
  },
  {
    slug: 'teams',
    title: 'Teams Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph Teams tools.',
  },
  {
    slug: 'files',
    title: 'Files Workload Guide',
    description: 'Catalog guide for discovering and executing OneDrive and file tools.',
  },
  {
    slug: 'sharepoint',
    title: 'SharePoint Workload Guide',
    description: 'Catalog guide for discovering and executing SharePoint site and list tools.',
  },
  {
    slug: 'users',
    title: 'Users Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph user tools.',
  },
  {
    slug: 'groups',
    title: 'Groups Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph group tools.',
  },
  {
    slug: 'meetings',
    title: 'Meetings Workload Guide',
    description: 'Catalog guide for discovering and executing online meeting tools.',
  },
  {
    slug: 'presence',
    title: 'Presence Workload Guide',
    description: 'Catalog guide for discovering and executing Microsoft Graph presence tools.',
  },
  {
    slug: 'virtual-events',
    title: 'Virtual Events Workload Guide',
    description: 'Catalog guide for discovering and executing virtual event tools.',
  },
]);

export const NAVIGATION_GUIDE_RESOURCE: StaticCatalogResource = Object.freeze({
  uri: 'm365://catalog/navigation-guide.md',
  name: 'catalog-navigation-guide',
  title: 'Microsoft 365 MCP Catalog Navigation Guide',
  description: 'Master navigation guide for the static Microsoft 365 MCP resource catalog.',
  mimeType: MARKDOWN_MIME_TYPE,
  resourcePath: 'resources/navigation-guide.md',
});

function workloadGuideResource(definition: WorkloadGuideDefinition): WorkloadGuideResource {
  return Object.freeze({
    slug: definition.slug,
    uri: `m365://catalog/workloads/${definition.slug}.md`,
    name: `catalog-workload-${definition.slug}`,
    title: definition.title,
    description: definition.description,
    mimeType: MARKDOWN_MIME_TYPE,
    resourcePath: `resources/workloads/${definition.slug}.md`,
  });
}

export const WORKLOAD_GUIDES: readonly WorkloadGuideResource[] = Object.freeze(
  WORKLOAD_GUIDE_DEFINITIONS.map((definition) => workloadGuideResource(definition))
);

export const STATIC_CATALOG_RESOURCES: readonly StaticCatalogResource[] = Object.freeze([
  NAVIGATION_GUIDE_RESOURCE,
  ...WORKLOAD_GUIDES,
]);
