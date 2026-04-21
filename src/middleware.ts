import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Permisos por ruta prefix → roles que tienen acceso
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard/admin":       ["ADMINISTRADOR"],
  "/dashboard/empleados":   ["ADMINISTRADOR"],
  "/dashboard/pacientes":   ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"],
  "/dashboard/citas":       ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION"],
  "/dashboard/biomedica":   ["ADMINISTRADOR", "INGENIERIA_BIOMEDICA", "JEFE_BIOMEDICA"],
  "/dashboard/limpieza":    ["ADMINISTRADOR", "LIMPIEZA", "MANTENIMIENTO"],
  "/dashboard/farmacia":    ["ADMINISTRADOR", "FARMACIA"],
  "/dashboard/urgencias":   ["ADMINISTRADOR", "URGENCIAS"],
  // /dashboard/dispositivo is open to all authenticated roles (QR scan landing)
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;
    const rol: string = token?.rol ?? "";

    // Allow admin access everywhere
    if (rol === "ADMINISTRADOR") return NextResponse.next();

    // Check each protected prefix
    for (const [prefix, allowed] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(prefix) && !allowed.includes(rol)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
