import { describe, expect, it } from 'vitest';
import { validateEndpoints } from '../src/dynamic-tools.mjs';

/**
 * This test file ensures that all the mappings in TARGET_ENDPOINTS actually match
 * the endpoints in the OpenAPI spec. It helps catch issues where:
 *
 * 1. An endpoint in TARGET_ENDPOINTS doesn't exist in the OpenAPI spec
 * 2. The method for an endpoint doesn't match what's in the OpenAPI spec
 *
 * This is a more automated approach than manually running the app and tailing logs.
 */

describe('Mappings Validation', () => {
  it('should verify all TARGET_ENDPOINTS exist in the OpenAPI spec', () => {
    const missingEndpoints = validateEndpoints();

    if (missingEndpoints.length > 0) {
      console.error('The following endpoints are missing from the OpenAPI spec:');
      missingEndpoints.forEach((endpoint) => {
        console.error(
          `- Tool: ${endpoint.toolName}, Path: ${endpoint.pathPattern}, Method: ${endpoint.method}`
        );
      });
    }

    expect(missingEndpoints).toEqual([]);
  });
});
