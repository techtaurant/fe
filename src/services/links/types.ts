export type LinkLikeStatus = "LIKE" | "DISLIKE" | "NONE";
export type LinkListSort = "PUBLISHED" | "LIKE" | "SAVE";
export type LinkListPeriod = "WEEK" | "MONTH" | "YEAR" | "ALL";
export type LinkDateRange = "7d" | "30d" | "365d" | "all";
export type LinkSortOption = "latest" | "likes" | "saves";

export function isLinkLikeStatus(value: unknown): value is LinkLikeStatus {
  return value === "LIKE" || value === "DISLIKE" || value === "NONE";
}

export interface LinkTag {
  id: string;
  name: string;
}

export interface LinkContent {
  id: string;
  title: string;
  url: string;
  summary?: string;
  sourceCompanyUserId?: string;
  sourceCompanyName?: string;
  sourceCompanyProfileImageUrl?: string;
  publishedAt?: string;
  tags: LinkTag[];
  createdAt: string;
  updatedAt?: string;
  viewCount?: number;
  likeCount?: number;
  saveCount?: number;
  likeStatus?: LinkLikeStatus;
  isSaved?: boolean;
  isRead?: boolean;
}

export interface OpenLinkListResponse {
  status: number;
  data: {
    content: OpenLinkItem[];
    nextCursor?: string | null;
    hasNext?: boolean;
    size?: number;
  };
  message?: string;
}

export interface OpenLinkDetailResponse {
  status: number;
  data: OpenLinkItem;
  message?: string;
}

export interface LinkListResult {
  links: LinkContent[];
  nextCursor?: string;
  hasNext: boolean;
  size: number;
}

export interface LinkViewerState {
  linkId: string;
  isSaved: boolean;
  isRead: boolean;
}

export interface LinkViewerStateListResponse {
  status: number;
  data: LinkViewerState[];
  message?: string;
}

export interface CompanyLinkListResponse {
  status: number;
  data: {
    content: OpenLinkItem[];
    nextCursor?: string | null;
    hasNext?: boolean;
    size?: number;
  };
  message?: string;
}

export interface FetchOpenLinksParams {
  cursor?: string;
  size?: number;
  sourceCompanyUserId?: string;
  sourceCompanyName?: string;
  tag?: string;
  period?: LinkListPeriod;
  sort?: LinkListSort;
}

export interface LinkMutationResponse {
  status: number;
  message?: string;
}

export interface LinkReactionState {
  likeStatus: LinkLikeStatus;
  likeCount?: number;
}

export interface OpenLinkItem {
  id?: string;
  linkId?: string;
  title?: string;
  url?: string;
  summary?: string | null;
  sourceCompanyUserId?: string | number | null;
  publishedAt?: string | null;
  tags?: Array<LinkTag | string> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  saveCount?: number | null;
  likeStatus?: LinkLikeStatus | null;
  isSaved?: boolean | null;
  isRead?: boolean | null;
}

export interface UserProfileImageItem {
  userId?: string | number | null;
  authorName?: string | null;
  profileImageUrl?: string | null;
}

export interface UserProfileImageListResponse {
  status: number;
  data: UserProfileImageItem[];
  message?: string;
}

export interface UserSearchItem {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

export interface UserSearchResponse {
  status: number;
  data: UserSearchItem[];
  message?: string;
}
