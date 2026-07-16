import webpush from "web-push";

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:suporte@canetta.app";

  if (!publicKey || !privateKey) {
    throw new Error("Web Push env vars are missing.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}
