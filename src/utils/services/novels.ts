import { CreateNovelBody, CreateNovelCommentBody, CreateNovelCommentResponse, GetNovelsQParams, GetNovelCommentsResponse, ListedNovel, ListedUserRating, Platform, UpdateNovelBody, UpdateNovelThumbnailBody, UpsertRatingBody } from "@/contracts/novels";
import { HttpService } from "./core";
import { novelTags } from "../cacheTags";

export class NovelsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/novels');
  }

  getComments(novelId: string, options?: { limit?: number; replies?: number }) {
    return this.get<GetNovelCommentsResponse>(`/${novelId}/comments`, {
      cache: 'no-store',
      queryParams: {
        limit: options?.limit,
        replies: options?.replies,
      },
    });
  }

  addComment(novelId: string, body: CreateNovelCommentBody) {
    return this.post<CreateNovelCommentResponse, CreateNovelCommentBody>(`/${novelId}/comments`, body, {
      cache: 'no-store',
    });
  }

  deleteComment(novelId: string, commentId: string) {
    return this.delete<{ ok: true }>(`/${novelId}/comments/${commentId}`, {
      cache: 'no-store',
    });
  }

  getRatingSummary(novelId: string, options?: { limit?: number }) {
    return this.get<{ average: number; total: number; categories?: { plot: number; characters: number; backgroundsUi: number; characterArt: number; music: number; soundEffects: number; emotionalImpact: number }; recent?: ListedUserRating[]; mine?: ListedUserRating }>(`/${novelId}/ratings`, { cache: 'no-store', queryParams: { limit: options?.limit } });
  }
  upsertRating(novelId: string, body: UpsertRatingBody) {
    return this.put<{ average: number; total: number; mine: unknown }, UpsertRatingBody>(`/${novelId}/ratings`, body, { cache: 'no-store' });
  }
  deleteRating(novelId: string) {
    return this.delete<{ average: number; total: number }>(`/${novelId}/ratings`, { cache: 'no-store' });
  }

  deleteRatingReason(novelId: string, ratingId: string) {
    return this.delete<{ ok: true }>(`/${novelId}/ratings/${ratingId}/reason`, { cache: 'no-store' });
  }
  
  getNovels(options: GetNovelsQParams = {}) {
    // Request is too big to cache
    return this.get<ListedNovel[]>('/', {
      cache: 'no-cache',
      queryParams: options,
    });
  }
  getNovelById(id: string) {
    return this.get<ListedNovel>(`/${id}`, {
      cache: 'no-store',
      next: {
        revalidate: 0,
        tags: novelTags.novel(id),
      }
    });
  }

  createNovel(novel: CreateNovelBody) {
    return this.post<ListedNovel, CreateNovelBody>('/', novel);
  }
  updateNovel(id: string, novel: UpdateNovelBody) {
    return this.put<ListedNovel, UpdateNovelBody>(`/${id}`, novel);
  }

  uploadThumbnail(novelId: string, thumbnailFile: File) {
    const formData = new FormData();
    formData.append('thumbnail', thumbnailFile);

    return this.put<ListedNovel, UpdateNovelThumbnailBody>(`/${novelId}/thumbnail`, formData);
  }

  uploadFile(novelId: string, platform: Platform, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.put<ListedNovel, FormData>(`/${novelId}/files/${platform}`, formData);
  }

  deleteNovel(novelId: string) {
    return this.delete<void>(`/${novelId}`);
  }
}
