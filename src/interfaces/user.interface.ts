import { Channel } from "./channels.interface";

export type activityType = "" | "voice" | "streaming" | "video";
export type FriendInterface = Omit<
  User,
  "-provider" | "-inbox" | "-email" | "-password" | "-firstName" | "-lastName" | "-googleId" | "-updatedAt" | "-channelSlug" | "-latestStatus"
>;

/** Like FriendInterface but with friends as an array of IDs (string[]), e.g. from API when friends are not populated */
export type FriendInterfaceWithFriendIds = Omit<FriendInterface, "friends"> & { friends: string[] };

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  email: string;
  friends: FriendInterface[];
  pronouns: string;
  status: { type: StatusType; duration: StatusDuration };
  latestStatus: { type: StatusType; duration: StatusDuration };
  provider: string;
  phoneNumber: string;
  profilePicture: string;
  profileCover: string;
  password: string;
  bio: string;
  obsession: { text: string | null; emoji: string | null; duration: ObsessionDuration };
  googleId: string;
  activity: activityType;
  channelSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInitialState {
  isLoggedIn: boolean;
  userInfo: User;
  notifications: Notification[];
  friendRequests: FriendRequest[];
  channelsInfo: Channel[];
}

export interface CreateAccountRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  profilePicture?: string;
  provider: string;
}

export interface SendFriendRequest {
  username: string;
  sender: FriendInterface;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  profilePicture?: string;
  profileCover?: string;
  bio?: string;
  pronouns?: string;
  status?: { type: StatusType; duration: StatusDuration };
  obsession?: { text: string | null; emoji: string | null; duration: ObsessionDuration };
  activity?: string;
  phoneNumber?: string;
}
export enum NotificationType {
  FriendRequest = "friend request",
}
export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
export interface CreateAccountResponse extends User {
  password: string;
}

export interface Notification {
  _id: string;
  sentAt: Date;
  type: NotificationType;
  receiver: string;
  notificationSender: FriendInterface;
  content: string;
  isRead: boolean;
}

interface Mention {
  id: string;
  sentAt: Date;
  from: FriendInterface;
  content: string;
}
export enum FriendRequestStatus {
  Pending = "pending",
  Accepted = "accepted",
  Rejected = "rejected",
}

export interface FriendRequest {
  _id: string;
  status: FriendRequestStatus;
  sentAt: Date;
  receiver: string;
  sender: FriendInterface;
}

export interface InboxInterface {
  notification: Notification[];
  mentions: Mention[];
  friendRequests: FriendRequest[];
}

export enum StatusType {
  Online = "Online",
  Invisible = "Invisible",
  DoNotDisturb = "Do Not Disturb",
  Idle = "Idle",
}

export enum StatusDuration {
  FifteenMinutes = 15,
  OneHour = 60,
  ThreeHours = 180,
  EightHours = 480,
  TwentyFourHours = 1440,
  Forever = -1,
}

export enum ObsessionDuration {
  ClearAfterToday = 1440,
  ThirtyMinutes = 30,
  OneHour = 60,
  FourHours = 240,
  DontClear = -1,
}
