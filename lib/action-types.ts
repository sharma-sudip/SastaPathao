export type PostActionState =
  | {
      error?: string;
      fieldErrors?: { origin?: string; destination?: string; departAt?: string };
    }
  | undefined;
export type ClaimActionState = { error?: string; success?: string } | undefined;
