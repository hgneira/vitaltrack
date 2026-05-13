"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";

interface Props {
  onUnread: (n: number) => void;
  onToast: (t: { id: string; autor: string; contenido: string; canal: string; canalId: string; urgente: boolean }) => void;
}

export default function ChatNotifications({ onUnread, onToast }: Props) {
  const { data: session } = useSession();
  const myId: string = (session?.user as any)?.id ?? "";
  const pathname = usePathname();
  const router = useRouter();
  const unreadRef = useRef(0);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Clear unread when user navigates to chat
  useEffect(() => {
    if (pathname === "/dashboard/chat") {
      unreadRef.current = 0;
      onUnread(0);
    }
  }, [pathname]);

  // Dynamically import Pusher (avoids SSR issues) and subscribe to all channels
  useEffect(() => {
    if (!myId || !PUSHER_KEY) return;

    let pusherInstance: any = null;
    let cancelled = false;

    (async () => {
      const { default: Pusher } = await import("pusher-js");
      if (cancelled) return;

      pusherInstance = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        authEndpoint: "/api/chat/pusher/auth",
      });

      let channels: any[] = [];

      try {
        const res = await fetch("/api/chat/canales");
        const canales: any[] = await res.json();
        if (cancelled || !Array.isArray(canales)) return;

        channels = canales.map(canal => {
          const ch = pusherInstance.subscribe(`canal-${canal.id}`);
          ch.bind("nuevo-mensaje", (msg: any) => {
            if (msg.autor?.id === myId) return;

            const onChatPage = window.location.pathname === "/dashboard/chat";

            if (!onChatPage) {
              unreadRef.current += 1;
              onUnread(unreadRef.current);
              onToast({
                id: msg.id,
                autor: msg.autor?.nombre ?? "Alguien",
                contenido: msg.contenido,
                canal: canal.nombre,
                canalId: canal.id,
                urgente: !!msg.esUrgente,
              });
            }

            // Browser notification — works even with tab not focused
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              const title = msg.esUrgente
                ? `⚡ URGENTE — ${msg.autor?.nombre}`
                : `${msg.autor?.nombre} en #${canal.nombre}`;
              try {
                const notif = new Notification(title, {
                  body: msg.contenido,
                  icon: "/favicon.ico",
                  tag: `chat-${canal.id}`,
                  silent: !msg.esUrgente,
                });
                notif.onclick = () => {
                  window.focus();
                  router.push(`/dashboard/chat?canal=${canal.id}`);
                  notif.close();
                };
              } catch {}
            }
          });
          return ch;
        });
      } catch {}
    })();

    return () => {
      cancelled = true;
      if (pusherInstance) pusherInstance.disconnect();
    };
  }, [myId]);

  return null;
}
