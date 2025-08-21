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
} from "@/contracts/novels";
import { HttpService } from "./core";
import { novelTags } from "../cacheTags";

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

  uploadThumbnail(novelId: string, thumbnailFile: File) {
    const formData = new FormData();
    formData.append("thumbnail", thumbnailFile);

    return this.put<UpdateNovelThumbnailResponse, UpdateNovelThumbnailBody>(
      `/${novelId}/thumbnail`,
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

  deleteNovel(novelId: string) {
    return this.delete<void>(`/${novelId}`);
  }
}
