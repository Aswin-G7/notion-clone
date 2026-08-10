export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number; // Duration in ms. Default is 4000ms. Set 0 for no auto-dismiss.
  action?: NotificationAction;
  createdAt: number;
}

export type NotificationOptions = Omit<ToastNotification, "id" | "createdAt">;

type NotificationListener = (notifications: ToastNotification[]) => void;

export class NotificationService {
  private notifications: ToastNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private maxNotifications = 5;
  private defaultDuration = 4000;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Publish a new toast notification event
   */
  public notify(options: NotificationOptions): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const duration = options.duration !== undefined ? options.duration : this.defaultDuration;

    const notification: ToastNotification = {
      ...options,
      id,
      duration,
      createdAt: Date.now(),
    };

    // Prepend new notification; limit max queue size
    this.notifications = [notification, ...this.notifications].slice(0, this.maxNotifications);

    // Set auto-dismiss timer if duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    this.notifyListeners();
    return id;
  }

  /**
   * Convenience helpers
   */
  public success(
    title: string,
    description?: string,
    action?: NotificationAction,
    duration?: number
  ): string {
    return this.notify({ type: "success", title, description, action, duration });
  }

  public error(
    title: string,
    description?: string,
    action?: NotificationAction,
    duration?: number
  ): string {
    return this.notify({
      type: "error",
      title,
      description,
      action,
      duration: duration ?? 6000,
    });
  }

  public warning(
    title: string,
    description?: string,
    action?: NotificationAction,
    duration?: number
  ): string {
    return this.notify({ type: "warning", title, description, action, duration });
  }

  public info(
    title: string,
    description?: string,
    action?: NotificationAction,
    duration?: number
  ): string {
    return this.notify({ type: "info", title, description, action, duration });
  }

  /**
   * Dismiss a specific notification by ID
   */
  public dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const prevLength = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (this.notifications.length !== prevLength) {
      this.notifyListeners();
    }
  }

  /**
   * Clear all active notifications
   */
  public dismissAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    if (this.notifications.length > 0) {
      this.notifications = [];
      this.notifyListeners();
    }
  }

  /**
   * Get copy of current active notifications list
   */
  public getNotifications(): ToastNotification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification state updates
   */
  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // Immediately publish state to new subscriber
    listener(this.getNotifications());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const current = this.getNotifications();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error("Error in NotificationService listener:", err);
      }
    }
  }
}

export const notificationService = new NotificationService();
