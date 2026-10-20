export interface NotificationItem {
  id: string;
  category: number | string;
  requiresAction?: boolean;
  type: number | string;
  title?: string;
  content?: string | null;
  entityId: string;
  actorCount: number;
  metadata: Record<string, unknown> | string | null;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
}

export interface NotificationResponse {
  data: NotificationItem[];
  total: number;
  unreadByCategory?: Record<string, number>;
  // unreadTotal: number;
}
