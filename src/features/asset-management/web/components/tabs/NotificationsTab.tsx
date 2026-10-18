import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import NotificationCard from '@/components/featured/notification/components/NotificationCard';
import type { NotificationItem } from '@/components/featured/notification/components/notification.types';
import { Switch } from '@/components/shared/atoms/web/switch';

export default function NotificationsTab({ asset }: { asset: any }) {
  const { t } = useTranslation();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  
  const notifications: NotificationItem[] = [
    {
      id: '1',
      category: 'trading',
      title: { key: 'noti.1', defaultValue: 'Buyout Proposal Created' },
      description: { key: 'noti.1.desc', defaultValue: 'Shark has created a buyout proposal. Please vote.' },
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      category: 'system',
      title: { key: 'noti.2', defaultValue: 'Rent Deducted' },
      description: { key: 'noti.2.desc', defaultValue: "150 VNĐ was successfully deducted for this month's rent." },
      timestamp: '1 day ago',
      read: true,
    },
    {
      id: '3',
      category: 'user',
      title: { key: 'noti.3', defaultValue: 'Asset Configuration Changed' },
      description: { key: 'noti.3.desc', defaultValue: 'DAO approved the new maintenance fee structure.' },
      timestamp: '5 days ago',
      read: true,
    },
  ];

  const filteredNotifications = showUnreadOnly ? notifications.filter(n => !n.read) : notifications;
  const unreadTotal = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full pb-16 space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-h3-bold tracking-tight text-foreground">
            {t('assetManagement.notifications.title', 'Asset Notifications')}
          </h2>
          <p className="text-body-small-regular text-muted-foreground mt-2 max-w-2xl">
            {t('assetManagement.notifications.desc', 'Updates regarding your asset.')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-body-medium-semibold text-foreground inline-flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <Switch
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
              className="data-[state=checked]:bg-primary-500 h-4 w-[27px] border-0 p-0 data-[state=unchecked]:bg-neutral-200 [&>[data-slot=switch-thumb]]:h-3 [&>[data-slot=switch-thumb]]:w-3 [&>[data-slot=switch-thumb]]:shadow-[0px_0.8px_2.4px_0px_rgba(16,24,40,0.1)] [&>[data-slot=switch-thumb][data-state=checked]]:translate-x-3.5 [&>[data-slot=switch-thumb][data-state=unchecked]]:translate-x-0.5"
            />
            <span className="text-body-medium-semibold text-foreground">
              {t('notifications.onlyUnread', 'Only show unread')}
            </span>
          </label>
        </div>
      </div>

      <div className="bg-background border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:border-border">
        {filteredNotifications.length > 0 ? (
           <div className="flex flex-col divide-y divide-border/50">
             {filteredNotifications.map((item) => (
               <NotificationCard
                 key={item.id}
                 item={item}
                 onClick={() => {}}
               />
             ))}
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 text-center">
             <h3 className="text-h4-semibold text-foreground mt-4">
               {t('notifications.empty.title', 'No notifications')}
             </h3>
             <p className="text-body-small-regular text-muted-foreground mt-2 max-w-sm">
               {t('notifications.empty.description', 'You are caught up for this category.')}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
