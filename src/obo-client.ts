import { ConfidentialClientApplication } from '@azure/msal-node';
import logger from './logger.js';
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';

class OboClient {
  private cca: ConfidentialClientApplication;
  private graphScopes: string[];

  constructor(secrets: AppSecrets) {
    if (!secrets.clientSecret) {
      throw new Error(
        'On-Behalf-Of flow requires MS365_MCP_CLIENT_SECRET to be set (confidential client).'
      );
    }

    const cloudEndpoints = getCloudEndpoints(secrets.cloudType);

    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        authority: `${cloudEndpoints.authority}/${secrets.tenantId || 'common'}`,
      },
    });

    const graphBase = cloudEndpoints.graphApi.replace(/\/$/, '');
    this.graphScopes = [`${graphBase}/.default`];
  }

  async exchangeToken(userAssertion: string): Promise<string> {
    try {
      const result = await this.cca.acquireTokenOnBehalfOf({
        oboAssertion: userAssertion,
        scopes: this.graphScopes,
      });

      if (!result?.accessToken) {
        throw new Error('OBO token exchange returned no access token');
      }

      logger.info('OBO token exchange successful');
      return result.accessToken;
    } catch (error) {
      logger.error(`OBO token exchange failed: ${(error as Error).message}`);
      throw error;
    }
  }
}

export default OboClient;
