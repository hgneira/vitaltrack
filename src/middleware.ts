import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Permisos por ruta prefix → roles que tienen acceso
// More specific (longer) prefixes must come first in the object
const ROUTE_PERMISSIONS: [string, string[]][] = [
  ["/dashboard/admin",               ["ADMINISTRADOR"]],
  ["/dashboard/empleados",           ["ADMINISTRADOR"]],
  ["/dashboard/urgencias",           ["ADMINISTRADOR", "URGENCIAS", "MEDICO", "ENFERMERIA", "RECEPCION", "JEFE_BIOMEDICA", "INGENIERIA_BIOMEDICA", "MANTENIMIENTO"]],
  ["/dashboard/pacientes",           ["ADMINISTRADOR", "MEDICO", "ENFERMERIA", "RECEPCION", "URGENCIAS"]],
  ["/dashboard/citas",               ["ADMINISTRADOR", "ENFERMERIA"]],
  ["/dashboard/biomedica",           ["ADMINISTRADOR", "JEFE_BIOMEDICA", "MANTENIMIENTO", "INGENIERIA_BIOMEDICA"]],
  ["/dashboard/limpieza",            ["ADMINISTRADOR", "MANTENIMIENTO"]],
  ["/dashboard/farmacia",            ["ADMINISTRADOR"]],
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;
    const rol: string = token?.rol ?? "";

    // Allow admin access everywhere
    if (rol === "ADMINISTRADOR") return NextResponse.next();

    // Find the most specific matching prefix (first match wins since array is ordered)
    for (const [prefix, allowed] of ROUTE_PERMISSIONS) {
      if (pathname.startsWith(prefix)) {
        if (!allowed.includes(rol)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        break; // most specific match found, stop checking
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
