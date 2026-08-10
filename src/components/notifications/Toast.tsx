import React from "react";
import { ToastNotification, notificationService } from "../../services/NotificationService";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface ToastProps {
  notification: ToastNotification;
}

export const Toast: React.FC<ToastProps> = ({ notification }) => {
  const { id, type, title, description, action } = notification;

  const renderIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (action) {
      action.onClick();
      notificationService.dismiss(id);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.dismiss(id);
  };

  return (
    <div
      id={`toast-${id}`}
      role="alert"
      className="pointer-events-auto w-full max-w-sm flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-[#222222] text-stone-900 dark:text-stone-100 border border-stone-200/90 dark:border-stone-800 shadow-xl dark:shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in font-sans select-none"
    >
      {renderIcon()}

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate leading-snug">
            {title}
          </p>
        </div>

        {description && (
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed break-words font-normal">
            {description}
          </p>
        )}

        {action && (
          <div className="mt-2.5 flex items-center">
            <button
              id={`toast-action-${id}`}
              type="button"
              onClick={handleActionClick}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      <button
        id={`toast-dismiss-${id}`}
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
        title="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
