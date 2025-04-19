import { expect, test, describe } from 'vitest';
import { 
  createFriendlyParamName,
  registerParamMapping,
  getOriginalParamName,
  transformParamsToOriginal 
} from '../src/param-mapper.mjs';

describe('Parameter Mapper', () => {
  test('createFriendlyParamName removes $ prefix', () => {
    expect(createFriendlyParamName('$orderby')).toBe('orderby');
    expect(createFriendlyParamName('$select')).toBe('select');
    expect(createFriendlyParamName('$expand')).toBe('expand');
  });

  test('createFriendlyParamName leaves regular params unchanged', () => {
    expect(createFriendlyParamName('subject')).toBe('subject');
    expect(createFriendlyParamName('contentType')).toBe('contentType');
  });

  test('registerParamMapping and getOriginalParamName work together', () => {
    // Register a mapping
    registerParamMapping('list-mail-messages', 'orderby', '$orderby');
    
    // Retrieve the original name
    expect(getOriginalParamName('list-mail-messages', 'orderby')).toBe('$orderby');
    
    // Unknown mappings return the friendly name
    expect(getOriginalParamName('list-mail-messages', 'unknown')).toBe('unknown');
    expect(getOriginalParamName('unknown-tool', 'orderby')).toBe('orderby');
  });

  test('transformParamsToOriginal converts all params', () => {
    // Register mappings
    registerParamMapping('list-mail-messages', 'orderby', '$orderby');
    registerParamMapping('list-mail-messages', 'select', '$select');
    registerParamMapping('list-mail-messages', 'top', '$top');
    
    // Transform params
    const params = {
      orderby: 'receivedDateTime desc',
      select: 'subject,from,receivedDateTime',
      top: 10,
      normalParam: 'value'
    };
    
    const transformed = transformParamsToOriginal('list-mail-messages', params);
    
    expect(transformed).toEqual({
      '$orderby': 'receivedDateTime desc',
      '$select': 'subject,from,receivedDateTime',
      '$top': 10,
      'normalParam': 'value'
    });
  });
});