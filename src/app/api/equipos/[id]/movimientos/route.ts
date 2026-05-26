import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const registros = await prisma.registroRFID.findMany({
    where: { equipoId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(registros);
}
