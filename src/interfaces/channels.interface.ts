import { MessageInterface } from "./message.interface";
import { FriendInterface, StatusType } from "./user.interface";

export enum ChannelType {
  Direct = "Direct",
  Server = "Server",
  Group = "Group",
}

export interface CreateChannelBody {
  members: string[];
  groupOrServerName?: string;
  groupOrServerLogo?: string;
  type: ChannelType;
}

export interface UpdateChannelBody {
  members?: FriendInterface[];
  groupOrServerName?: string;
  groupOrServerLogo?: string;
  createdBy?: string;
  type?: ChannelType;
  pinnedMessages?: string;
  updatedAt?: Date;
}

export interface CreateChannelResponse {
  success: boolean;
  message: string;
  data: {
    type: ChannelType;
    route: string;
    extraRoute?: string;
    channel: Channel;
  };
}

export interface Channel {
  _id: string;
  members: FriendInterface[];
  directChannelOtherMember?: FriendInterface;
  listActive?: boolean;
  notificationsCount?: number;
  updatedAt?: Date;
  type: ChannelType;
  createdBy: string;
  groupOrServerName?: string;
  groupOrServerLogo?: string;
  pinnedMessages?: MessageInterface[];
  createdAt: string;
  serverInvitationLink?: { link: string, id: string };
  channelMessageRooms?: ChannelMessageRoom[]
  channelCallRooms?: { _id: string, name: string }[]
}

export interface ChannelMessageRoom {
  _id: string;
  name: string;
  type?: string;
}

export interface ChannelInitialState {
  channelsInfo: Channel[];
}

export interface ChannelDisplayData {
  _id: string; // Add this to identify the channel
  channelName: string;
  channelAvatar: string;
  channelAvatarFallbackText: string;
  channelStatus: StatusType | null;
  channelType: ChannelType;
  memberCount?: number; // Add this for groups
  friend?: FriendInterface; // Add this for direct messages
  channel: Channel; // Keep reference to original channel
}

export enum ServerChannelType {
  Text = "Text",
  Voice = "Voice",
}


export enum ChannelAction {
  Leave = "Leave",
  Delete = "Delete",
}