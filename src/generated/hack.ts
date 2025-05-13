import { z } from 'zod';

/**
 * Simplified version of Zodios makeApi function
 * Just returns the endpoints array for our own use
 */
export function makeApi(endpoints: any[]) {
  return endpoints;
}

/**
 * Mock Zodios class that won't be used in our implementation
 */
export class Zodios {
  constructor(baseUrlOrEndpoints: any, endpoints?: any, options?: any) {
    // This is just a stub class
  }
}

/**
 * Stub for ZodiosOptions type
 */
export type ZodiosOptions = {
  // Add any options you might need
};
