export interface NotificationItem {
  id: string;
  category: number;
  type: number;
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
  // unreadTotal: number;
}
