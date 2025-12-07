export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role?: string | null;
  regions?: string[];
};
