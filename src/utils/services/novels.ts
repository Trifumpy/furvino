import {
  CreateNovelBody,
  CreateNovelCommentBody,
  CreateNovelCommentResponse,
  GetNovelsQParams,
  GetNovelCommentsResponse,
  ListedNovel,
  ListedUserRating,
  Platform,
  UpdateNovelBody,
  UpdateNovelThumbnailBody,
  UpsertRatingBody,
  GetNovelsResponse,
  GetNovelResponse,
  CreateNovelResponse,
  UpdateNovelResponse,
  UpdateNovelThumbnailResponse,
  UpdateNovelPageBackgroundResponse,
  UpdateNovelPageBackgroundBody,
  CreateNovelGalleryItemResponse,
  CreateNovelGalleryItemBody,
  DeleteNovelGalleryItemResponse,
  GetNovelLayoutResponse,
  UpdateNovelLayoutBody,
  UpdateNovelLayoutResponse,
} from "@/contracts/novels";
import { HttpService } from "./core";
import { novelTags } from "../cacheTags";

export type UploadStats = {
  concurrency?: number;
  inFlight: number;
  uploadedBytes: number;
  totalBytes: number;
  mbps: number;
};

export class NovelsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, "/novels");
  }

  getComments(novelId: string, options?: { limit?: number; replies?: number }) {
    return this.get<GetNovelCommentsResponse>(`/${novelId}/comments`, {
      cache: "no-store",
      queryParams: {
        limit: options?.limit,
        replies: options?.replies,
      },
    });
  }

  addComment(novelId: string, body: CreateNovelCommentBody) {
    return this.post<CreateNovelCommentResponse, CreateNovelCommentBody>(
      `/${novelId}/comments`,
      body,
      {
        cache: "no-store",
      }
    );
  }

  deleteComment(novelId: string, commentId: string) {
    return this.delete<{ ok: true }>(`/${novelId}/comments/${commentId}`, {
      cache: "no-store",
    });
  }

  getRatingSummary(novelId: string, options?: { limit?: number }) {
    return this.get<{
      average: number;
      total: number;
      categories?: {
        plot: number;
        characters: number;
        backgroundsUi: number;
        characterArt: number;
        music: number;
        soundEffects: number;
        emotionalImpact: number;
      };
      recent?: ListedUserRating[];
      mine?: ListedUserRating;
    }>(`/${novelId}/ratings`, {
      cache: "no-store",
      queryParams: { limit: options?.limit },
    });
  }
  upsertRating(novelId: string, body: UpsertRatingBody) {
    return this.put<
      { average: number; total: number; mine: unknown },
      UpsertRatingBody
    >(`/${novelId}/ratings`, body, { cache: "no-store" });
  }
  deleteRating(novelId: string) {
    return this.delete<{ average: number; total: number }>(
      `/${novelId}/ratings`,
      { cache: "no-store" }
    );
  }

  deleteRatingReason(novelId: string, ratingId: string) {
    return this.delete<{ ok: true }>(`/${novelId}/ratings/${ratingId}/reason`, {
      cache: "no-store",
    });
  }

  // Updates
  getUpdates(novelId: string, options?: { limit?: number }) {
    return this.get<import("@/contracts/novels").GetNovelUpdatesResponse>(
      `/${novelId}/updates`,
      { cache: "no-store", queryParams: { limit: options?.limit } }
    );
  }
  createUpdate(novelId: string, body: import("@/contracts/novels").CreateNovelUpdateBody) {
    return this.post<
      import("@/contracts/novels").CreateNovelUpdateResponse,
      import("@/contracts/novels").CreateNovelUpdateBody
    >(`/${novelId}/updates`, body, { cache: "no-store" });
  }
  deleteUpdate(novelId: string, updateId: string) {
    return this.delete<import("@/contracts/novels").DeleteNovelUpdateResponse>(
      `/${novelId}/updates/${updateId}`,
      { cache: "no-store" }
    );
  }

  getNovels(options: GetNovelsQParams = {}) {
    // Request is too big to cache
    return this.get<GetNovelsResponse>("/", {
      cache: "no-cache",
      queryParams: options,
    });
  }
  getNovelById(id: string) {
    return this.get<GetNovelResponse>(`/${id}`, {
      cache: "no-store",
      next: {
        revalidate: 0,
        tags: novelTags.novel(id),
      },
    });
  }

  createNovel(novel: CreateNovelBody) {
    return this.post<CreateNovelResponse, CreateNovelBody>("/", novel);
  }
  updateNovel(id: string, novel: UpdateNovelBody) {
    return this.put<UpdateNovelResponse, UpdateNovelBody>(`/${id}`, novel);
  }

  updateVisibility(id: string, isHidden: boolean) {
    return this.put<UpdateNovelResponse, { isHidden: boolean }>(`/${id}/visibility`, { isHidden }, { cache: "no-store" });
  }

  importFromItch(novelId: string, itchUrl: string) {
    return this.post<GetNovelResponse, { url: string }>(
      `/${novelId}/import/itch`,
      { url: itchUrl },
      { cache: "no-store" }
    );
  }

  createFromItch(itchUrl: string, options?: { authorId?: string }) {
    return this.post<CreateNovelResponse, { url: string; authorId?: string }>(
      `/import/itch`,
      { url: itchUrl, authorId: options?.authorId },
      { cache: "no-store" }
    );
  }

  uploadThumbnail(novelId: string, thumbnailFile: File) {
    const formData = new FormData();
    formData.append("thumbnail", thumbnailFile);

    return this.put<UpdateNovelThumbnailResponse, UpdateNovelThumbnailBody>(
      `/${novelId}/thumbnail`,
      formData
    );
  }

  uploadBanner(novelId: string, bannerFile: File) {
    const formData = new FormData();
    formData.append("banner", bannerFile);

    return this.put<UpdateNovelPageBackgroundResponse, UpdateNovelPageBackgroundBody>(
      `/${novelId}/banner`,
      formData
    );
  }

  uploadGalleryItem(novelId: string, file: File, options?: { slot?: number }) {
    const formData = new FormData();
    // API expects the field name to be "image"
    formData.append("image", file);
    if (options?.slot && Number.isFinite(options.slot)) {
      formData.append("slot", String(options.slot));
    }

    return this.post<CreateNovelGalleryItemResponse, CreateNovelGalleryItemBody>(
      `/${novelId}/gallery`,
      formData
    );
  }

  uploadFile(
    novelId: string,
    platform: Platform,
    file: File,
    onProgress?: (loaded: number, total: number) => void
  ) {
    // Use XHR to report upload progress
    const url = `${this.baseUrl}/${this.prefix}/${novelId}/files/${platform}`;
    const formData = new FormData();
    formData.append("file", file);

    return new Promise<ListedNovel>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.responseType = "json";

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(evt.loaded, evt.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as ListedNovel);
        } else {
          const text =
            typeof xhr.response === "string"
              ? xhr.response
              : JSON.stringify(xhr.response);
          reject(new Error(`HTTP ${xhr.status}: ${text}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(formData);
    });
  }

  deleteFile(novelId: string, platform: Platform) {
    return this.delete<ListedNovel>(`/${novelId}/files/${platform}`, {
      cache: "no-store",
    });
  }

  deleteGalleryItem(novelId: string, galleryItemId: string) {
    return this.delete<DeleteNovelGalleryItemResponse>(`/${novelId}/gallery/${galleryItemId}`, {
      cache: "no-store",
    });
  }

  deleteNovel(novelId: string) {
    return this.delete<void>(`/${novelId}`);
  }

  // Layout
  getLayout(novelId: string) {
    return this.get<GetNovelLayoutResponse>(`/${novelId}/layout`, { cache: "no-store" });
  }
  updateLayout(novelId: string, body: UpdateNovelLayoutBody) {
    return this.put<UpdateNovelLayoutResponse, UpdateNovelLayoutBody>(
      `/${novelId}/layout`,
      body,
      { cache: "no-store" }
    );
  }

  // Upload with stats callback for UI progress display
  uploadThumbnailWithStats(
    novelId: string,
    thumbnailFile: File,
    onStats?: (stats: UploadStats) => void
  ) {
    const url = `${this.baseUrl}/${this.prefix}/${novelId}/thumbnail`;
    const formData = new FormData();
    formData.append("thumbnail", thumbnailFile);

    return new Promise<UpdateNovelThumbnailResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.responseType = "json";

      // Report upload progress as stats
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onStats) {
          const stats: UploadStats = {
            concurrency: 1, // Single upload, no concurrency
            inFlight: 1,
            uploadedBytes: evt.loaded,
            totalBytes: evt.total,
            mbps: 0, // Could calculate, but simplified for now
          };
          onStats(stats);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as UpdateNovelThumbnailResponse);
        } else {
          const text =
            typeof xhr.response === "string"
              ? xhr.response
              : JSON.stringify(xhr.response);
          reject(new Error(`HTTP ${xhr.status}: ${text}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(formData);
    });
  }

  uploadBannerWithStats(
    novelId: string,
    bannerFile: File,
    onStats?: (stats: UploadStats) => void
  ) {
    const url = `${this.baseUrl}/${this.prefix}/${novelId}/banner`;
    const formData = new FormData();
    formData.append("banner", bannerFile);

    return new Promise<UpdateNovelPageBackgroundResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.responseType = "json";

      // Report upload progress as stats
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onStats) {
          const stats: UploadStats = {
            concurrency: 1, // Single upload, no concurrency
            inFlight: 1,
            uploadedBytes: evt.loaded,
            totalBytes: evt.total,
            mbps: 0, // Could calculate, but simplified for now
          };
          onStats(stats);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as UpdateNovelPageBackgroundResponse);
        } else {
          const text =
            typeof xhr.response === "string"
              ? xhr.response
              : JSON.stringify(xhr.response);
          reject(new Error(`HTTP ${xhr.status}: ${text}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(formData);
    });
  }
}
