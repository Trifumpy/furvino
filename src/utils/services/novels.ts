import { CreateNovelBody, ListedNovel, UpdateNovelBody } from "@/contracts/novels";
import { HttpService } from "./core";
import { novelTags } from "../cacheTags";

export class NovelsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/novels');
  }
  
  getNovels() {
    // Request is too big to cache
    return this.get<ListedNovel[]>('/', {
      cache: 'no-cache',
    });
  }
  getNovelById(id: string) {
    return this.get<ListedNovel>(`/${id}`, {
      next: {
        revalidate: 60 * 30, // revalidate every 30 minutes
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
}
