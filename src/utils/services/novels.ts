import { Novel } from "@/novels/types";
import { HttpService } from "./core";

export class NovelsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/novels');
  }
  
  getNovels() {
    // Request is too big to cache
    return this.get<Novel[]>('/', {
      cache: 'no-cache',
    });
  }
  getNovelById(id: string) {
    return this.get<Novel>(`/${id}`, {
      next: {
        revalidate: 60 * 30, // revalidate every 30 minutes
      }
    });
  }
}
