import { ErrorCode, McpError, type ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { exportSkillPack } from './packs.js';
import { SkillNameZod } from './schema.js';
import { getVisibleSkillRecord, listVisibleSkillRecords, type SkillRecord } from './store.js';
import { JSON_MIME_TYPE } from '../mcp-resources/read.js';

export const SKILL_MARKDOWN_MIME_TYPE = 'text/markdown';

export type SkillResourceView = 'skills/index' | 'skills/markdown' | 'skills/schema' | 'skill-pack';

export interface SkillResourceDescriptor {
  readonly view: SkillResourceView;
  readonly name?: string;
  readonly packName?: string;
}

function canonicalSkillUri(tenantId: string, descriptor: SkillResourceDescriptor): string {
  switch (descriptor.view) {
    case 'skills/index':
      return `m365://tenant/${tenantId}/skills/index.json`;
    case 'skills/markdown':
      return `m365://tenant/${tenantId}/skills/${descriptor.name}.md`;
    case 'skills/schema':
      return `m365://tenant/${tenantId}/skills/${descriptor.name}.schema.json`;
    case 'skill-pack':
      return `m365://tenant/${tenantId}/skill-packs/${descriptor.packName}.json`;
  }
}

function textResult(uri: string, mimeType: string, text: string): ReadResourceResult {
  return { contents: [{ uri, mimeType, text }] };
}

function jsonResult(uri: string, data: unknown): ReadResourceResult {
  return textResult(uri, JSON_MIME_TYPE, JSON.stringify(data, null, 2));
}

function publicSkill(skill: SkillRecord, includeBody = false): Record<string, unknown> {
  return {
    name: skill.name,
    title: skill.title,
    description: skill.description,
    frontmatter: skill.frontmatter,
    arguments: skill.arguments,
    visibility: skill.visibility,
    source: skill.source,
    sourceSkillName: skill.sourceSkillName,
    version: skill.version,
    enabled: skill.enabled,
    ...(includeBody ? { body: skill.body } : {}),
  };
}

function skillMarkdown(skill: SkillRecord): string {
  const frontmatter = JSON.stringify(
    {
      name: skill.name,
      title: skill.title,
      description: skill.description,
      arguments: skill.arguments,
      ...skill.frontmatter,
    },
    null,
    2
  );
  return `---\n${frontmatter}\n---\n${skill.body}`;
}

async function requireSkill(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<SkillRecord> {
  const parsedName = SkillNameZod.parse(name);
  const skill = await getVisibleSkillRecord(tenantId, parsedName, ownerSubject);
  if (!skill) {
    throw new McpError(ErrorCode.InvalidParams, `Skill resource not found: ${name}`, {
      code: 'invalid_resource_uri',
    });
  }
  return skill;
}

export async function readSkillResource(
  tenantId: string,
  descriptor: SkillResourceDescriptor,
  ownerSubject?: string
): Promise<ReadResourceResult> {
  const canonical = canonicalSkillUri(tenantId, descriptor);
  switch (descriptor.view) {
    case 'skills/index': {
      const skills = await listVisibleSkillRecords(tenantId, ownerSubject);
      return jsonResult(canonical, {
        uri: canonical,
        skills: skills.map((skill) => publicSkill(skill)),
      });
    }
    case 'skills/markdown': {
      const skill = await requireSkill(tenantId, descriptor.name ?? '', ownerSubject);
      return textResult(canonical, SKILL_MARKDOWN_MIME_TYPE, skillMarkdown(skill));
    }
    case 'skills/schema': {
      const skill = await requireSkill(tenantId, descriptor.name ?? '', ownerSubject);
      return jsonResult(canonical, publicSkill(skill));
    }
    case 'skill-pack': {
      const pack = await exportSkillPack(tenantId, {
        packName: descriptor.packName ?? 'default',
        ownerSubject: ownerSubject,
      });
      return jsonResult(canonical, {
        uri: canonical,
        ...pack,
      });
    }
  }
}
