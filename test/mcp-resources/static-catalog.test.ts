import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  STATIC_CATALOG_RESOURCES,
  WORKLOAD_GUIDES,
  type StaticCatalogResource,
} from '../../src/lib/mcp-resources/catalog.js';

const LOCKED_WORKLOAD_SLUGS = [
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function resourceFilePath(resource: StaticCatalogResource): string {
  return path.join(REPO_ROOT, 'src', resource.resourcePath);
}

function readResource(resource: StaticCatalogResource): string {
  return fs.readFileSync(resourceFilePath(resource), 'utf-8');
}

describe('Phase 7 Plan 07-06 static resource catalog manifest', () => {
  it('WORKLOAD_GUIDES contains exactly the locked workload slug set', () => {
    expect(WORKLOAD_GUIDES.map((guide) => guide.slug)).toEqual(LOCKED_WORKLOAD_SLUGS);
  });

  it('STATIC_CATALOG_RESOURCES contains navigation plus one URI per workload guide', () => {
    const expectedUris = [
      'm365://catalog/navigation-guide.md',
      ...LOCKED_WORKLOAD_SLUGS.map((slug) => `m365://catalog/workloads/${slug}.md`),
    ];

    expect(STATIC_CATALOG_RESOURCES.map((resource) => resource.uri)).toEqual(expectedUris);
    expect(STATIC_CATALOG_RESOURCES).toHaveLength(11);
  });

  it('every manifest entry has stable resource metadata', () => {
    for (const resource of STATIC_CATALOG_RESOURCES) {
      expect(resource.name).toMatch(/^catalog-[a-z0-9-]+$/);
      expect(resource.description.length).toBeGreaterThan(24);
      expect(resource.uri).toMatch(/^m365:\/\/catalog\/.+\.md$/);
      expect(resource.mimeType).toBe('text/markdown');
      expect(resource.resourcePath).toMatch(/^resources\/.+\.md$/);
    }
  });
});

describe('Phase 7 Plan 07-06 static markdown resource content', () => {
  it('all 11 static markdown files exist at the manifest paths', () => {
    for (const resource of STATIC_CATALOG_RESOURCES) {
      expect(fs.existsSync(resourceFilePath(resource)), resource.resourcePath).toBe(true);
    }
  });

  it('build config copies static resource markdown into dist/resources', () => {
    const buildConfig = fs.readFileSync(path.join(REPO_ROOT, 'tsup.config.ts'), 'utf-8');

    expect(buildConfig).toContain('copyMarkdownTree');
    expect(buildConfig).toContain("path.resolve('src/resources')");
    expect(buildConfig).toContain("path.resolve('dist/resources')");
  });

  it('every workload guide references the discover-schema-execute loop', () => {
    for (const guide of WORKLOAD_GUIDES) {
      const markdown = readResource(guide);
      expect(markdown, guide.slug).toContain('search-tools');
      expect(markdown, guide.slug).toContain('get-tool-schema');
      expect(markdown, guide.slug).toContain('execute-tool');
    }
  });

  it('navigation guide links all workload slugs and preserves the scope-map contract', () => {
    const navigationGuide = STATIC_CATALOG_RESOURCES.find(
      (resource) => resource.uri === 'm365://catalog/navigation-guide.md'
    );
    expect(navigationGuide).toBeDefined();

    const markdown = readResource(navigationGuide!);
    for (const slug of LOCKED_WORKLOAD_SLUGS) {
      expect(markdown).toContain(`m365://catalog/workloads/${slug}.md`);
    }
    expect(markdown).toContain('m365://catalog/scope-map.json');
  });
});
