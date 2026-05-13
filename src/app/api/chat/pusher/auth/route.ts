import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId: string = (session.user as any).id ?? "";
  const userName: string = (session.user as any).name ?? "";
  const rol: string = (session.user as any).rol ?? "";

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id") ?? "";
  const channelName = params.get("channel_name") ?? "";

  try {
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: userId,
      user_info: { name: userName, rol },
    });
    return Response.json(authResponse);
  } catch {
    return new Response("Auth failed", { status: 403 });
  }
}
