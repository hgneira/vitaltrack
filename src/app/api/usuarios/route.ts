import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Any authenticated user can read; only admin can see all fields
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const rol = searchParams.get("rol");

    const usuarios = await prisma.user.findMany({
      where: {
        // When filtering by role (e.g. fetching médicos for cita form), only show active users.
        // When listing all users for admin, show everyone.
        ...(rol ? { activo: true, rol: rol as any } : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        titulo: true,
        email: true,
        rol: true,
        especialidad: true,
        subespecialidad: true,
        cedulaProfesional: true,
        escuela: true,
        telefono: true,
        foto: true,
        activo: true,
        createdAt: true,
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    return NextResponse.json(usuarios);
  } catch {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const hashedPassword = await bcrypt.hash(body.password, 12);

    const usuario = await prisma.user.create({
      data: {
        nombre: body.nombre,
        apellidos: body.apellidos ?? null,
        email: body.email,
        password: hashedPassword,
        rol: body.rol,
        especialidad: body.especialidad ?? null,
        telefono: body.telefono ?? null,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        rol: true,
        activo: true,
      },
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
