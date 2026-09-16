import { isLinkLikeStatus } from "./types";
import type {
  FetchOpenLinksParams,
  LinkContent,
  LinkListResult,
  LinkTag,
  OpenLinkDetailResponse,
  OpenLinkItem,
  OpenLinkListResponse,
  UserProfileImageListResponse,
  UserSearchResponse,
} from "./types";

export const LINK_CONTENT_REVALIDATE_SECONDS = 300;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function buildApiUrl(path: string, params?: URLSearchParams): string {
  const url = new URL(path, API_BASE_URL);
  params?.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}

function normalizeString(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function normalizeTags(tags?: Array<LinkTag | string> | null): LinkTag[] {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      if (typeof tag === "string") {
        const name = tag.trim();
        return name ? { id: name, name } : null;
      }

      const name = normalizeString(tag.name);
      if (!name) return null;
      return {
        id: normalizeString(tag.id) ?? name,
        name,
      };
    })
    .filter((tag): tag is LinkTag => Boolean(tag));
}

function normalizeCount(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeBoolean(value?: boolean | null): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function getUniqueSourceCompanyUserIds(links: LinkContent[]): string[] {
  return Array.from(
    new Set(
      links
        .map((link) => link.sourceCompanyUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ).slice(0, 100);
}

async function fetchSourceCompanyProfileMap(
  sourceCompanyUserIds: string[],
): Promise<Map<string, { name?: string; profileImageUrl?: string }>> {
  if (sourceCompanyUserIds.length === 0) return new Map();

  const searchParams = new URLSearchParams();
  sourceCompanyUserIds.forEach((userId) => {
    searchParams.append("userIds", userId);
  });

  const result = await fetchOpenApi<UserProfileImageListResponse>(
    "/open-api/users/profile-images",
    searchParams,
  ).catch(() => null);

  if (!result?.data) return new Map();

  const profileMap = new Map<string, { name?: string; profileImageUrl?: string }>();
  result.data.forEach((profile) => {
    const userId = normalizeString(profile.userId);
    if (!userId) return;

    profileMap.set(userId, {
      name: normalizeString(profile.authorName),
      profileImageUrl: normalizeString(profile.profileImageUrl),
    });
  });

  return profileMap;
}

async function fetchSourceCompanyUserIdByName(
  sourceCompanyName?: string,
): Promise<string | undefined> {
  const normalizedName = normalizeString(sourceCompanyName);
  if (!normalizedName) return undefined;

  const searchParams = new URLSearchParams();
  searchParams.set("name", normalizedName);

  const result = await fetchOpenApi<UserSearchResponse>(
    "/open-api/users/search",
    searchParams,
  ).catch(() => null);

  const users = result?.data ?? [];
  const exactMatch = users.find(
    (user) => normalizeString(user.name)?.toLowerCase() === normalizedName.toLowerCase(),
  );

  return normalizeString(exactMatch?.id) ?? normalizeString(users[0]?.id);
}

function applySourceCompanyProfiles(
  links: LinkContent[],
  profileMap: Map<string, { name?: string; profileImageUrl?: string }>,
): LinkContent[] {
  return links.map((link) => {
    if (!link.sourceCompanyUserId) return link;

    const profile = profileMap.get(link.sourceCompanyUserId);
    if (!profile) return link;

    return {
      ...link,
      sourceCompanyName: profile.name,
      sourceCompanyProfileImageUrl: profile.profileImageUrl,
    };
  });
}

export function normalizeLinkContent(item: OpenLinkItem): LinkContent {
  const id = normalizeString(item.id) ?? normalizeString(item.linkId) ?? "";
  const title = normalizeString(item.title) ?? "Untitled link";
  const url = normalizeString(item.url) ?? "";
  const createdAt =
    normalizeString(item.createdAt) ??
    normalizeString(item.publishedAt) ??
    normalizeString(item.updatedAt) ??
    "";

  return {
    id,
    title,
    url,
    summary: normalizeString(item.summary),
    sourceCompanyUserId: normalizeString(item.sourceCompanyUserId),
    publishedAt: normalizeString(item.publishedAt),
    tags: normalizeTags(item.tags),
    createdAt,
    updatedAt: normalizeString(item.updatedAt),
    viewCount: normalizeCount(item.viewCount),
    likeCount: normalizeCount(item.likeCount),
    saveCount: normalizeCount(item.saveCount),
    likeStatus: isLinkLikeStatus(item.likeStatus) ? item.likeStatus : undefined,
    isSaved: normalizeBoolean(item.isSaved),
    isRead: normalizeBoolean(item.isRead),
  };
}

async function fetchOpenApi<T>(path: string, params?: URLSearchParams): Promise<T> {
  const response = await fetch(buildApiUrl(path, params), {
    method: "GET",
    next: { revalidate: LINK_CONTENT_REVALIDATE_SECONDS },
  });

  if (response.status === 404) {
    throw new Error("NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchOpenLinks(
  params: FetchOpenLinksParams = {},
): Promise<LinkListResult> {
  const searchParams = new URLSearchParams();
  const hasSourceCompanyNameFilter = Boolean(
    !params.sourceCompanyUserId && normalizeString(params.sourceCompanyName),
  );
  const sourceCompanyUserId =
    params.sourceCompanyUserId ??
    (await fetchSourceCompanyUserIdByName(params.sourceCompanyName));

  if (hasSourceCompanyNameFilter && !sourceCompanyUserId) {
    return {
      links: [],
      hasNext: false,
      size: params.size ?? 20,
    };
  }

  if (params.cursor) searchParams.set("cursor", params.cursor);
  searchParams.set("size", String(params.size ?? 20));
  if (sourceCompanyUserId) {
    searchParams.set("sourceCompanyUserId", sourceCompanyUserId);
  }
  if (params.tag) searchParams.set("tag", params.tag);
  if (params.period) searchParams.set("period", params.period);
  if (params.sort) searchParams.set("sort", params.sort);

  const result = await fetchOpenApi<OpenLinkListResponse>("/open-api/links", searchParams);
  const links = result.data.content.map(normalizeLinkContent).filter((link) => link.id && link.url);
  const nextCursor = result.data.nextCursor ?? undefined;
  const profileMap = await fetchSourceCompanyProfileMap(
    getUniqueSourceCompanyUserIds(links),
  );

  return {
    links: applySourceCompanyProfiles(links, profileMap),
    nextCursor,
    hasNext: result.data.hasNext ?? Boolean(nextCursor),
    size: result.data.size ?? params.size ?? 20,
  };
}

export async function fetchOpenLinkDetail(linkId: string): Promise<LinkContent> {
  const result = await fetchOpenApi<OpenLinkDetailResponse>(
    `/open-api/links/${encodeURIComponent(linkId)}`,
  );
  const link = normalizeLinkContent(result.data);

  if (!link.id || !link.url) {
    throw new Error("INVALID_LINK_RESPONSE");
  }

  const profileMap = await fetchSourceCompanyProfileMap(
    getUniqueSourceCompanyUserIds([link]),
  );

  return applySourceCompanyProfiles([link], profileMap)[0] ?? link;
}
