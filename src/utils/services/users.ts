import { HttpService } from "./core";
import { GetUsersQParams, ListedUser, PublicUser, UpdateUserModerationBody } from "@/contracts/users";

export class UsersService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/users');
  }
  
  getMe() {
    // Request is too big to cache
    return this.get<ListedUser>('/me', {
      cache: 'no-cache',
    });
  }

  getUser(userId: string) {
    return this.get<ListedUser>(`/${userId}`, {
      cache: 'no-cache',
    });
  }

  getUsers(options: GetUsersQParams = {}) {
    return this.get<PublicUser[]>('/', {
      cache: 'no-cache',
      queryParams: {
        ...options,
        search: options.search ? options.search : undefined,
      },
    });
  }

  updateModeration(userId: string, body: UpdateUserModerationBody) {
    return this.patch<PublicUser, UpdateUserModerationBody>(`/${userId}/moderation`, body, {
      cache: 'no-cache',
    });
  }

  unassignAuthor(userId: string) {
    return this.delete<{ ok: true }>(`/${userId}/author`);
  }

  unassignAndRemoveAuthor(userId: string) {
    return this.delete<{ ok: true }>(`/${userId}/author`, {
      queryParams: { remove: true },
    });
  }
}
