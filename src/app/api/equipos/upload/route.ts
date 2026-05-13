import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// This route only generates the client upload token.
// The file goes directly from browser → Vercel Blob (bypasses the 4.5MB serverless limit).
export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: 50 * 1024 * 1024,
    }),
    onUploadCompleted: async () => {
      // DB save is handled by the client after upload completes
    },
  });

  return Response.json(jsonResponse);
}
