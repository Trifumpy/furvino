import { HttpService } from "./core";
import {
  CreateAuthorBody,
  CreateAuthorResponse,
  GetAuthorResponse,
  GetAuthorsQueryParams,
  GetAuthorsResponse,
  LinkAuthorBody,
  LinkAuthorResponse,
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
        includeDeleted: options.includeDeleted
      },
    });
  }
  getAuthorById(id: string) {
    return this.get<GetAuthorResponse>(`/${id}`, {
      next: {
        revalidate: 60 * 30, // revalidate every 30 minutes
      },
    });
  }

  createAuthor(author: CreateAuthorBody) {
    return this.post<CreateAuthorResponse, CreateAuthorBody>("/", author);
  }

  linkAuthor(authorId: string, userId: string) {
    return this.patch<LinkAuthorResponse, LinkAuthorBody>(`/${authorId}/link`, {
      userId,
    });
  }
}
