import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getGridFSBucket } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: jpeg, png, gif, webp, svg" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = await getGridFSBucket();

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
    });

    await new Promise<void>((resolve, reject) => {
      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    const id = uploadStream.id.toString();
    const baseUrl = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const url = `${baseUrl}/api/images/${id}`;

    return NextResponse.json({ url, id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Image upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
