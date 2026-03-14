import { Channel } from "./channels.interface";
import { FriendInterface, User } from "./user.interface";
import { JSONContent } from "@tiptap/react";

export interface MessageInterface {
  _id: string;
  referenceId: string;
  referenceMessageRoomId?: string;
  message: JSONContent;
  attachment: Attachment[];
  sentBy?: FriendInterface;
  createdAt?: Date;
  updatedAt?: Date;
  reactions: ReactionInterface[];
  isPinned?: boolean;
  type: MessageType;
  replyMessageId?: MessageInterface;
  forwardMessageId?: string;
  additionalData?: Channel;
}

export interface PinnedMessageInterface {
  _id: string;
  referenceId: Channel;
  referenceMessageRoomId?: string;
  message: JSONContent;
  attachment: Attachment[];
  sentBy?: FriendInterface;
  createdAt?: Date;
  updatedAt?: Date;
  reactions: ReactionInterface[];
  isPinned?: boolean;
  type: MessageType;
  replyMessageId?: MessageInterface;
  forwardMessageId?: string;
}

export interface AddMessageBody {
  referenceId: string;
  referenceMessageRoomId?: string;
  message: JSONContent;
  attachment?: Attachment[];
  sentBy: string;
  type: MessageType;
  replyMessageId?: string;
  forwardMessageId?: string;
}

export interface UpdateMessageBody {
  isPinned?: boolean;
  message: JSONContent;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
  duration?: number;
  key?: string;
  isUploading?: boolean;
}

export interface ReactionInterface {
  emoji: string;
  label: string;
  counter: number;
  sentBy: User[];
}

export enum MessageType {
  TEXT = 'Text',
  REPLY = 'Reply',
  FORWARD = 'Forward',
  PINNED_MSG_SYSTEM = 'PinnedMessageSystem',
  CALL_END_MSG_SYSTEM = 'CallEndMessageSystem',
  CALL_MISSED_MSG_SYSTEM = 'CallMissedMessageSystem',
  SERVER_INVITATION = 'ServerInvitation',
  REMOVAL_MSG_SYSTEM = 'RemovalMessageSystem',
  ADDING_MSG_SYSTEM = 'AddingMessageSystem',
}