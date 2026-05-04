export type Message = {
  readonly content?: string;
  readonly createdAt: string;
  readonly id: string;
  readonly isDeleted: boolean;
  readonly isEdited: boolean;
  readonly likeCount: number;
  readonly likes: readonly MessageLike[];
  readonly media: readonly MessageMedia[];
  readonly messageType: MessageType;
  readonly parent?: Message;
  readonly parentId?: string;
  readonly replyCount: number;
  readonly updatedAt: string;
  readonly user: MessageUser;
  readonly userId: string;
};

export type MessageLike = {
  readonly createdAt: string;
  readonly id: string;
  readonly messageId: string;
  readonly user: MessageUser;
  readonly userId: string;
};

export type MessageMedia = {
  readonly createdAt: string;
  readonly duration?: number;
  readonly fileSize?: number;
  readonly height?: number;
  readonly id: string;
  readonly mediaType: 'file' | 'image' | 'video';
  readonly mediaUrl: string;
  readonly messageId: string;
  readonly mimeType?: string;
  readonly sortOrder: number;
  readonly width?: number;
};

export type MessageType = 'emoji' | 'file' | 'image' | 'sticker' | 'text' | 'video';

export type MessageUser = {
  readonly id: string;
  readonly profile?: {
    readonly avatar?: string;
    readonly firstName?: string;
    readonly lastName?: string;
  };
  readonly username?: string;
};

export type SendMessageRequest = {
  readonly content?: string;
  readonly mediaUrls?: readonly string[];
  readonly messageType: MessageType;
  readonly parentId?: string;
};
