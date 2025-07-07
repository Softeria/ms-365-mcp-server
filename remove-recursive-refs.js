#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect if a schema definition creates recursive references
 * Handles complex recursive paths like #/definitions/X/properties/body/anyOf/1
 *
 * I really really hope this solves
 * https://github.com/Softeria/ms-365-mcp-server/issues/36 and perhaps even
 * https://github.com/Softeria/ms-365-mcp-server/issues/62
 *
 * Or any other silly tool that doesn't support recursive $refs
 *
 * Note - if the tool still struggles with $ref in general, this fix won't help!
 */
function detectRecursiveRefs(schema, definitionName) {
  if (!schema || typeof schema !== 'object') return [];

  const recursions = [];
  const currentDefPath = `#/definitions/${definitionName}`;

  function findAllRefs(obj, path = []) {
    const refs = [];

    function traverse(current, currentPath) {
      if (!current || typeof current !== 'object') return;

      if (Array.isArray(current)) {
        current.forEach((item, index) => traverse(item, [...currentPath, index]));
        return;
      }

      if (current.$ref) {
        refs.push({
          ref: current.$ref,
          path: currentPath.join('.'),
        });
        return;
      }

      Object.entries(current).forEach(([key, value]) => {
        traverse(value, [...currentPath, key]);
      });
    }

    traverse(obj, path);
    return refs;
  }

  const allRefs = findAllRefs(schema);

  for (const refInfo of allRefs) {
    const ref = refInfo.ref;

    if (ref.startsWith(currentDefPath)) {
      recursions.push({
        path: refInfo.path,
        ref: ref,
        type: 'recursive_reference',
      });
    } else if (ref === currentDefPath) {
      recursions.push({
        path: refInfo.path,
        ref: ref,
        type: 'direct_self_reference',
      });
    }
  }

  return recursions;
}

function removeRecursiveProperties(schema, recursions) {
  if (!schema || typeof schema !== 'object' || recursions.length === 0) {
    return schema;
  }

  const cleaned = JSON.parse(JSON.stringify(schema));

  const propertiesToRemove = new Set();

  for (const recursion of recursions) {
    const pathParts = recursion.path.split('.').filter((p) => p !== '');

    if (pathParts[pathParts.length - 1] === 'items' && pathParts.length > 1) {
      const propertyPath = pathParts.slice(0, -1).join('.');
      propertiesToRemove.add(propertyPath);
    } else {
      propertiesToRemove.add(recursion.path);
    }
  }

  const sortedPaths = Array.from(propertiesToRemove).sort(
    (a, b) => b.split('.').length - a.split('.').length
  );

  for (const propertyPath of sortedPaths) {
    const pathParts = propertyPath.split('.');

    let current = cleaned;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }

    if (current && typeof current === 'object') {
      const propertyName = pathParts[pathParts.length - 1];
      if (propertyName in current) {
        console.log(`  Removing recursive property: ${propertyPath}`);
        delete current[propertyName];
      }
    }
  }

  return cleaned;
}

/**
 * Process a tool to remove recursive references while keeping other $refs
 */
function processToolSchema(tool) {
  if (!tool.inputSchema || !tool.inputSchema.definitions) {
    return tool;
  }

  const definitions = tool.inputSchema.definitions;
  const processedDefinitions = {};
  let totalRecursionsRemoved = 0;

  console.log(`\n🔧 Processing ${tool.name}:`);

  for (const [defName, defSchema] of Object.entries(definitions)) {
    const recursions = detectRecursiveRefs(defSchema, defName);

    if (recursions.length > 0) {
      console.log(`  Found ${recursions.length} recursive references in ${defName}`);
      processedDefinitions[defName] = removeRecursiveProperties(defSchema, recursions);
      totalRecursionsRemoved += recursions.length;
    } else {
      processedDefinitions[defName] = defSchema;
    }
  }

  const cleanedTool = {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      definitions: processedDefinitions,
    },
  };

  console.log(`  ✂️  Removed ${totalRecursionsRemoved} recursive references`);
  return cleanedTool;
}

async function removeRecursiveRefs() {
  try {
    console.log('✂️  Removing Recursive References (Keeping Other $refs)\n');
    console.log('='.repeat(60));

    const inputPath = join(__dirname, 'schemas-with-refs-direct.json');
    if (!fs.existsSync(inputPath)) {
      throw new Error('Schema file not found. Run extract-schemas-direct.js first.');
    }

    const originalData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const tools = originalData.result?.tools || [];

    console.log(`Processing ${tools.length} tools...`);

    const processedTools = tools.map(processToolSchema);

    const cleanedData = {
      ...originalData,
      result: {
        ...originalData.result,
        tools: processedTools,
      },
    };

    const outputPath = join(__dirname, 'schemas-properties-removed.json');
    const cleanedString = JSON.stringify(cleanedData, null, 2);
    fs.writeFileSync(outputPath, cleanedString);

    console.log(`\n💾 Cleaned schemas saved to: ${outputPath}`);

    const originalString = JSON.stringify(originalData);
    const originalRefs = (originalString.match(/\$ref/g) || []).length;
    const cleanedRefs = (cleanedString.match(/\$ref/g) || []).length;
    const removedRefs = originalRefs - cleanedRefs;

    console.log('\n📊 CLEANING ANALYSIS');
    console.log('-'.repeat(40));
    console.log(
      `Original size:     ${originalString.length.toLocaleString()} chars (${(originalString.length / 1024).toFixed(2)} KB)`
    );
    console.log(
      `Cleaned size:      ${cleanedString.length.toLocaleString()} chars (${(cleanedString.length / 1024).toFixed(2)} KB)`
    );

    const sizeDiff = cleanedString.length - originalString.length;
    const sizeChange = ((sizeDiff / originalString.length) * 100).toFixed(1);
    console.log(`Size change:       ${sizeDiff.toLocaleString()} chars (${sizeChange}%)`);

    console.log(`\nOriginal $refs:    ${originalRefs}`);
    console.log(`Cleaned $refs:     ${cleanedRefs}`);
    console.log(`Removed $refs:     ${removedRefs}`);
    console.log(`Refs remaining:    ${((cleanedRefs / originalRefs) * 100).toFixed(1)}%`);

    console.log('\n🧪 QUICK RECURSION CHECK');
    console.log('-'.repeat(40));

    const sampleRecursiveTools = [
      'create-calendar-event',
      'update-calendar-event',
      'create-onenote-page',
    ];
    let foundRecursions = 0;

    for (const toolName of sampleRecursiveTools) {
      const tool = processedTools.find((t) => t.name === toolName);
      if (tool) {
        const toolString = JSON.stringify(tool);
        const recursivePattern = `#/definitions/${toolName}Parameters/properties/body/anyOf/1`;
        if (toolString.includes(recursivePattern)) {
          foundRecursions++;
          console.log(`  ❌ ${toolName}: Still contains recursive pattern`);
        } else {
          console.log(`  ✅ ${toolName}: Recursive pattern removed`);
        }
      }
    }

    if (foundRecursions === 0) {
      console.log('\n✅ No recursive patterns found in sample tools!');
    } else {
      console.log(`\n⚠️  ${foundRecursions} tools still contain recursive patterns`);
    }

    console.log('\n💡 SUMMARY');
    console.log('='.repeat(40));

    if (removedRefs > 0) {
      console.log(`✅ Successfully removed ${removedRefs} recursive references`);
      console.log(`✅ Kept ${cleanedRefs} non-recursive $ref references`);

      if (sizeDiff < 0) {
        console.log(`✅ Reduced schema size by ${Math.abs(sizeDiff).toLocaleString()} characters`);
      } else if (sizeDiff < originalString.length * 0.1) {
        console.log(`✅ Minimal size increase (${sizeChange}%)`);
      }

      console.log('\n📋 BENEFITS:');
      console.log('• Eliminates infinite recursion during flattening');
      console.log('• Preserves beneficial $ref references for shared types');
      console.log('• May allow partial flattening for LangChain compatibility');
      console.log('• Reduces schema complexity while maintaining functionality');
    } else {
      console.log('ℹ️  No recursive references found to remove');
    }

    const remainingRefTypes = new Set();
    cleanedString.match(/"#\/definitions\/[^"]+"/g)?.forEach((ref) => {
      const defName = ref.split('/').pop()?.replace('"', '');
      if (defName) remainingRefTypes.add(defName);
    });

    console.log(`\n🔗 Remaining reference types: ${remainingRefTypes.size}`);
    if (remainingRefTypes.size <= 10) {
      console.log('Sample remaining refs:', Array.from(remainingRefTypes).slice(0, 5).join(', '));
    }
  } catch (error) {
    console.error('Error removing recursive refs:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

export { removeRecursiveRefs };

if (import.meta.url === `file://${process.argv[1]}`) {
  removeRecursiveRefs();
}
