import { describe, expect, it } from 'vitest';
import { getCloudEndpoints, getDefaultClientId, parseCloudType } from '../src/cloud-config.js';

describe('gcc-high cloud', () => {
  it('uses the Azure Government authority and GCC High Graph endpoint', () => {
    expect(parseCloudType('GCC-High')).toBe('gcc-high');
    expect(getCloudEndpoints('gcc-high')).toEqual({
      authority: 'https://login.microsoftonline.us',
      graphApi: 'https://graph.microsoft.us',
      portal: 'https://portal.azure.us',
    });
  });

  it('has no default client ID, so one must be configured', () => {
    expect(() => getDefaultClientId('gcc-high')).toThrow(/MS365_MCP_CLIENT_ID/);
  });

  it('leaves the other clouds unchanged', () => {
    expect(getCloudEndpoints('global').authority).toBe('https://login.microsoftonline.com');
    expect(getDefaultClientId('china')).toBeTruthy();
  });
});
