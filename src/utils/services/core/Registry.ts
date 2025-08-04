import { AuthorsService } from "../authors";
import { NovelsService } from "../novels";

// Optionally read from env or config
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export class Registry {
  // Singleton instance
  private static instance: Registry | null = null;

  // Service instances
  public readonly authors: AuthorsService;
  public readonly novels: NovelsService;

  private constructor() {
    this.authors = new AuthorsService(API_BASE_URL);
    this.novels = new NovelsService(API_BASE_URL);
  }

  // Static getter to retrieve singleton instance
  public static get(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }
}
