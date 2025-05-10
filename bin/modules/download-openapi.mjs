/**
 * Module for downloading the Microsoft Graph API OpenAPI specification
 */

import fs from 'fs';

/**
 * Downloads the Microsoft Graph API OpenAPI specification if it doesn't exist
 *
 * @param {string} targetDir - The directory to save the OpenAPI spec
 * @param {string} targetFile - Path to save the OpenAPI spec
 * @param {string} openapiUrl - URL to download the OpenAPI spec from
 * @param {boolean} forceDownload - Force download even if file exists
 * @returns {Promise<boolean>} - Whether a download was performed
 */
export async function downloadGraphOpenAPI(
  targetDir,
  targetFile,
  openapiUrl,
  forceDownload = false
) {
  if (!fs.existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(targetFile) && !forceDownload) {
    console.log(`OpenAPI specification already exists at ${targetFile}`);
    console.log('Use --force to download again');
    return false;
  }

  console.log(`Downloading OpenAPI specification from ${openapiUrl}`);

  try {
    const response = await fetch(openapiUrl);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    fs.writeFileSync(targetFile, content);
    console.log(`OpenAPI specification downloaded to ${targetFile}`);
    return true;
  } catch (error) {
    console.error('Error downloading OpenAPI specification:', error.message);
    throw error;
  }
}
