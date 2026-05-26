import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const registros = await prisma.registroRFID.findMany({
    where: { equipoId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(registros);
}
