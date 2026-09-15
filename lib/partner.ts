import "server-only";

// Single hardcoded-via-env-var partner for now (a local barbershop) rather
// than a full roles/permissions system -- proportional to there being
// exactly one of these. Whoever signs in with this email can redeem
// coupons; see app/(site)/coupons/[code]/page.tsx.
export function isPartnerEmail(email: string | null | undefined) {
  const partnerEmail = process.env.PARTNER_BARBER_EMAIL;
  return !!email && !!partnerEmail && email.toLowerCase() === partnerEmail.toLowerCase();
}
