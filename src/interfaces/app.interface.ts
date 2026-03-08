import { MessageInterface } from "./message.interface";

export enum ConfigPrefix {
  SINGLE_IMAGE_UPLOADER = "singleImageUploader",
  CHAT_INPUT_UPLOADER = "chatInputUploader",
}

export enum ActiveUI {
  FRIENDS_LIST = "friendsList",
  MESSAGE_REQUESTS = "messageRequests",
  SERVER = "server",
  DIRECT_MESSAGES = "directMessages",
  GROUP = "group",
}

export enum FriendsView {
  ONLINE = "online",
  ALL = "all",
  PENDING = "pending",
  ADD_FRIEND = "addFriend",
}

export enum MessageRequestsView {
  REQUESTS = "requests",
  SPAM = "spam",
}

export enum FriendsSelectorView {
  SIDEBAR = "sidebar",
  DASHBOARD = "dashboard",
  CHANNEL = "channel",
}

export interface FriendListPageInfo<T> {
  status: string;
  count: number;
  items: T[];
  showStatus: boolean;
  requestIds: string[];
  onSearch: (search: string) => void;
}

export interface AppInitialState {
  isUploadingFile: boolean;
  activeUI: ActiveUI;
  sidebarOpen: boolean;
  showChannelDetails: boolean;
  friendsHeaderActiveUI: FriendsView;
  messageRequestsHeaderActiveUI: MessageRequestsView;
  isPinnedMessagesOpen: boolean;
  currentChannelId: string | null;
  isReplying: boolean;
  replyingToMessage: MessageInterface | null;
  activeChannelRoom: { _id: string, name: string, type?: string } | null;
  openServerInvitationDialog: boolean;
}

export type RecordingState = "idle" | "recording" | "paused"
