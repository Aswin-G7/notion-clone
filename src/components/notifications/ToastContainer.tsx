import React, { useEffect, useState } from "react";
import { ToastNotification, notificationService } from "../../services/NotificationService";
import { Toast } from "./Toast";

export const ToastContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    // Subscribe to NotificationService
    const unsubscribe = notificationService.subscribe((list) => {
      setNotifications(list);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div
      id="toast-container"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </div>
  );
};
