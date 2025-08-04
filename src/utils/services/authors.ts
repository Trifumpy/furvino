import { Author } from "@/users/types";
import { HttpService } from "./core";

export class AuthorsService extends HttpService {
  constructor(baseUrl: string) {
    super(baseUrl, '/authors');
  }
  
  getAuthors() {
    return this.get<Author[]>('/', {
      cache: 'no-cache',
    });
  }
  getAuthorById(id: string) {
    return this.get<Author>(`/${id}`, {
      next: {
        revalidate: 60 * 30, // revalidate every 30 minutes
      }
    });
  }
}
