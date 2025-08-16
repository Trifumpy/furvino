import { HttpService } from "./core";
import {
  AddCollectionItemBody,
  AddCollectionItemResponse,
  CreateCollectionBody,
  CreateCollectionResponse,
  GetMyCollectionsResponse,
} from "@/contracts/collections";

export class CollectionsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/collections');
  }

  getMyCollections() {
    return this.get<GetMyCollectionsResponse>('/', { cache: 'no-cache' });
  }

  createCollection(body: CreateCollectionBody) {
    return this.post<CreateCollectionResponse, CreateCollectionBody>('/', body);
  }

  addNovel(collectionId: string, body: AddCollectionItemBody) {
    return this.post<AddCollectionItemResponse, AddCollectionItemBody>(`/${collectionId}/items`, body);
  }

  deleteCollection(collectionId: string) {
    return this.delete<{ ok: true }>(`/${collectionId}`);
  }

  getCollection(collectionId: string) {
    return this.get<import("@/contracts/collections").GetCollectionResponse>(`/${collectionId}`, { cache: 'no-cache' });
  }

  updateCollection(collectionId: string, body: import("@/contracts/collections").UpdateCollectionBody) {
    return this.put<import("@/contracts/collections").UpdateCollectionResponse, import("@/contracts/collections").UpdateCollectionBody>(`/${collectionId}`, body);
  }

  removeNovel(collectionId: string, novelId: string) {
    return this.delete<{ ok: true }>(`/${collectionId}/items/${novelId}`);
  }

  duplicate(collectionId: string) {
    return this.post<{ id: string }, never>(`/${collectionId}/duplicate` as string, undefined as never);
  }

  follow(collectionId: string) {
    return this.post<{ ok: true }, never>(`/${collectionId}/follow` as string, undefined as never);
  }
  unfollow(collectionId: string) {
    return this.delete<{ ok: true }>(`/${collectionId}/follow`);
  }
}


