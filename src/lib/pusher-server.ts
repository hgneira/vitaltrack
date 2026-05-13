import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID ?? "placeholder",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY ?? "placeholder",
  secret: process.env.PUSHER_SECRET ?? "placeholder",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2",
  useTLS: true,
});

export const isPusherConfigured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_KEY &&
  !!process.env.PUSHER_SECRET;
