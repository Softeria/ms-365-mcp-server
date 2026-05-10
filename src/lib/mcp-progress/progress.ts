import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';

export interface ProgressNotificationSender {
  (notification: {
    method: 'notifications/progress';
    params: ProgressNotificationParams;
  }): void | Promise<void>;
}

export interface ProgressNotificationParams {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
}

export function progressSupported(profile: ClientCapabilityProfile | undefined): boolean {
  return profile?.capabilities.progress.effective === true;
}

export async function emitProgress(
  sendNotification: ProgressNotificationSender | undefined,
  profile: ClientCapabilityProfile | undefined,
  params: ProgressNotificationParams
): Promise<void> {
  if (!sendNotification || !progressSupported(profile)) return;
  await Promise.resolve(
    sendNotification({
      method: 'notifications/progress',
      params,
    })
  );
}
