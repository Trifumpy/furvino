import { authorTags } from "../cacheTags";
import { HttpService } from "./core";
import {
  CreateAuthorBody,
  CreateAuthorResponse,
  GetAuthorResponse,
  GetAuthorsQueryParams,
  GetAuthorsResponse,
  LinkAuthorBody,
  LinkAuthorResponse,
  UpdateAuthorBody,
} from "@/contracts/users";

export class AuthorsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, "/authors");
  }

  getAuthors(options: GetAuthorsQueryParams = {}) {
    return this.get<GetAuthorsResponse>("/", {
      cache: "no-cache",
      queryParams: {
        ...options,
        includeDeleted: options.includeDeleted,
      },
    });
  }
  getAuthorById(id: string) {
    return this.get<GetAuthorResponse>(`/${id}`, {
      next: {
        revalidate: 60 * 30,
        tags: authorTags.author(id),
      },
    });
  }

  createAuthor(author: CreateAuthorBody) {
    return this.post<CreateAuthorResponse, CreateAuthorBody>("/", author);
  }

  updateMe(author: UpdateAuthorBody) {
    return this.put<GetAuthorResponse, UpdateAuthorBody>(`/me`, author, {
      cache: "no-store",
    });
  }

  updateAuthor(authorId: string, author: UpdateAuthorBody) {
    return this.put<GetAuthorResponse, UpdateAuthorBody>(
      `/${authorId}`,
      author,
      { cache: "no-store" }
    );
  }

  linkAuthor(authorId: string, userId: string) {
    return this.patch<LinkAuthorResponse, LinkAuthorBody>(`/${authorId}/link`, {
      userId,
    });
  }

  deleteAuthor(authorId: string) {
    return this.delete<{ ok: true }>(`/${authorId}`);
  }
}
