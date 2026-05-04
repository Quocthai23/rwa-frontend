import type { Message, MessageUser } from '@/types/messages';

export type Conversation = {
  readonly id: string;
  readonly isBot?: boolean;
  readonly lastMessage?: Message;
  readonly unreadCount: number;
  readonly updatedAt: string;
  readonly user: MessageUser;
  readonly userId: string;
};
