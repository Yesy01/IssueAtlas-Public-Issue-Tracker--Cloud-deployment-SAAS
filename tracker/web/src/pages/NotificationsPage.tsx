import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getNotifications();
        if (!cancelled) {
          setNotifications(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Failed to load notifications");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClickNotification = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
    }
    navigate(`/issues/${n.issueId}`);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) {
    return <div className="p-6">Loading notifications…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Updates on issues you reported or upvoted.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No notifications yet. Go cause some civic chaos.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              onClick={() => handleClickNotification(n)}
              className={`p-3 rounded-lg border cursor-pointer transition
              ${
                n.read
                  ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  : "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium">
                  {n.issue?.title ?? "Issue update"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                {n.message}
              </div>
              {n.issue?.status && (
                <span className="inline-flex mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  Status: {n.issue.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
