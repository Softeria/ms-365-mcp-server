import { describe, expect, it } from 'vitest';
import { classifyToolRisk, confirmationIdFor } from '../src/lib/safe-writes/classifier.js';

describe('Phase 8 safe write classifier', () => {
  it('classifies GET operations as low-risk read-only idempotent tools', () => {
    const risk = classifyToolRisk({
      alias: 'list-mail-messages',
      method: 'get',
      path: '/me/messages',
    });

    expect(risk).toMatchObject({
      readOnly: true,
      write: false,
      destructive: false,
      idempotent: true,
      openWorld: true,
      riskLevel: 'low',
    });
  });

  it('classifies DELETE operations as destructive high-risk writes', () => {
    const risk = classifyToolRisk({
      alias: 'delete-mail-message',
      method: 'delete',
      path: '/me/messages/{message-id}',
    });

    expect(risk).toMatchObject({
      readOnly: false,
      write: true,
      destructive: true,
      idempotent: false,
      openWorld: true,
      riskLevel: 'high',
    });
  });

  it('classifies send-mail, move, permissions, and admin aliases as high risk', () => {
    for (const alias of [
      'send-mail',
      'move-mail-message',
      'list-drive-item-permissions',
      '__spadmin__sites-delete',
    ]) {
      expect(classifyToolRisk({ alias, method: 'post', path: '/x' }).riskLevel).toBe('high');
    }
  });

  it('returns stable confirmation ids per alias and risk level', () => {
    expect(confirmationIdFor('send-mail', 'high')).toBe('confirm:send-mail:high');
  });
});
