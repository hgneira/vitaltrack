import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const myId: string = (session.user as any).id ?? "";

    const users = await prisma.user.findMany({
      where: { activo: true, id: { not: myId } },
      select: { id: true, nombre: true, apellidos: true, rol: true, foto: true },
      orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
