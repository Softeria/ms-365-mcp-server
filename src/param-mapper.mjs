const paramMappings = new Map();

export function createFriendlyParamName(originalName) {
  if (originalName.startsWith('$')) {
    return originalName.substring(1);
  }
  
  return originalName;
}

export function registerParamMapping(toolName, friendlyName, originalName) {
  const key = `${toolName}:${friendlyName}`;
  paramMappings.set(key, originalName);
}

export function getOriginalParamName(toolName, friendlyName) {
  const key = `${toolName}:${friendlyName}`;
  return paramMappings.get(key) || friendlyName;
}

export function transformParamsToOriginal(toolName, params) {
  const result = {};
  
  for (const [friendlyName, value] of Object.entries(params)) {
    const originalName = getOriginalParamName(toolName, friendlyName);
    result[originalName] = value;
  }
  
  return result;
}