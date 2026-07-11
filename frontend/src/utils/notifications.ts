// Browser notification service for VOX.
// Uses the standard Web Notifications API (works in both browser and Electron).

class NotificationService {
  private static instance: NotificationService;
  private enabled = false;

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async init() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      this.enabled = true;
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      this.enabled = perm === 'granted';
    }
  }

  show(title: string, body: string, options?: NotificationOptions) {
    if (!this.enabled || document.visibilityState === 'visible') return;

    try {
      new Notification(title, {
        body,
        icon: '/vox-icon.png',
        badge: '/vox-icon.png',
        tag: 'vox-message',
        ...options,
      });
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  message(author: string, content: string, channelName?: string) {
    const sub = channelName ? `#${channelName}` : 'Direct Message';
    const body = content.length > 80 ? content.slice(0, 77) + '...' : content;
    this.show(author, `[${sub}] ${body}`);
  }

  mention(author: string, channelName: string) {
    this.show('@Mention', `${author} mentioned you in #${channelName}`);
  }

  dm(from: string, preview: string) {
    this.show(from, `[DM] ${preview}`);
  }
}

export const notifications = NotificationService.getInstance();
