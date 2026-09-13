import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  // The DrizzleAdapter returns the full `user` row (see lib/db/schema.ts),
  // so this is already present on the `user` the `signIn` callback in
  // auth.ts receives -- this just tells TypeScript about it.
  interface User {
    bannedAt?: Date | null;
  }
}
