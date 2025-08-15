import { SETTINGS } from "@/app/api/settings";
import { AuthorsService } from "../authors";
import { NovelsService } from "../novels";
import { UsersService } from "../users";

const API_BASE_URL = SETTINGS.apiUrl;

export class Registry {
  // Singleton instance
  private static instance: Registry | null = null;

  // Service instances
  public readonly authors: AuthorsService;
  public readonly novels: NovelsService;
  public readonly users: UsersService;

  private constructor() {
    this.authors = new AuthorsService(API_BASE_URL);
    this.novels = new NovelsService(API_BASE_URL);
    this.users = new UsersService(API_BASE_URL);
  }

  // Static getter to retrieve singleton instance
  public static get(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }
}
