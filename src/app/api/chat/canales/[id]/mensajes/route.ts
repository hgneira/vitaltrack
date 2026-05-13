import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { pusherServer, isPusherConfigured } from "@/lib/pusher-server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const mensajes = await prisma.chatMensaje.findMany({
      where: { canalId: id },
      include: { autor: { select: { id: true, nombre: true, apellidos: true, rol: true, foto: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(mensajes);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const userId: string = (session.user as any).id ?? "";
    const { contenido, esUrgente } = await request.json();
    if (!contenido?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    const mensaje = await prisma.chatMensaje.create({
      data: { canalId: id, autorId: userId, contenido: contenido.trim(), esUrgente: !!esUrgente },
      include: { autor: { select: { id: true, nombre: true, apellidos: true, rol: true, foto: true } } },
    });

    // Push via Pusher if configured
    if (isPusherConfigured) {
      await pusherServer.trigger(`canal-${id}`, "nuevo-mensaje", mensaje);
    }

    return NextResponse.json(mensaje, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
