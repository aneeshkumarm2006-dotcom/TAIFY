import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

// Upload an image to Vercel Blob and return its public URL.
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage not configured. Add a Vercel Blob store and BLOB_READ_WRITE_TOKEN.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const key = `blog/${base}-${Date.now()}.${ext}`;

  const blob = await put(key, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}
