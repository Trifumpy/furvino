export type Author = {
  id: string;
  name: string;
  user?: User; // Optional association with a User
}

export type User = {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  roles: string[];
}
