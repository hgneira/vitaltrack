import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol: string = (session.user as any).rol ?? "";
    const userId: string = (session.user as any).id ?? "";

    const canales = await prisma.chatCanal.findMany({
      where: {
        OR: [
          { tipo: "GENERAL" },
          { tipo: "ROL", rolAcceso: rol },
          { tipo: "ROL", rolAcceso: "ADMINISTRADOR" }, // admin sees all via separate logic
          // DMs involving this user
          { tipo: "DIRECTO", rolAcceso: { contains: userId } },
        ],
      },
      orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
      include: {
        mensajes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { autor: { select: { nombre: true } } },
        },
      },
    });

    // Admins see everything
    if (rol === "ADMINISTRADOR") {
      const todos = await prisma.chatCanal.findMany({
        orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
        include: {
          mensajes: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { autor: { select: { nombre: true } } },
          },
        },
      });
      return NextResponse.json(todos);
    }

    return NextResponse.json(canales);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const userId: string = (session.user as any).id ?? "";
    const otherUserId: string = (await request.json()).userId;
    if (!otherUserId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

    // Build DM key (sorted so it's deterministic)
    const [a, b] = [userId, otherUserId].sort();
    const dmKey = `dm:${a}:${b}`;

    const existing = await prisma.chatCanal.findFirst({ where: { rolAcceso: dmKey } });
    if (existing) return NextResponse.json(existing);

    // Get both user names
    const [me, other] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { nombre: true } }),
      prisma.user.findUnique({ where: { id: otherUserId }, select: { nombre: true } }),
    ]);

    const canal = await prisma.chatCanal.create({
      data: {
        nombre: `${me?.nombre ?? "?"} & ${other?.nombre ?? "?"}`,
        tipo: "DIRECTO",
        rolAcceso: dmKey,
      },
    });
    return NextResponse.json(canal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
