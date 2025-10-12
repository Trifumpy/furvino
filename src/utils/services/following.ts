import { HttpService } from "./core";
import { GetFollowingResponse } from "@/contracts/users";

export class FollowingService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, "/following");
  }

  getFollowing(options?: { page?: number; pageSize?: number }) {
    return this.get<GetFollowingResponse>("/", {
      cache: "no-store",
      queryParams: { page: options?.page, pageSize: options?.pageSize },
    });
  }
}


