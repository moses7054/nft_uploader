import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGridFSBucket } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(id);

    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(objectId);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      downloadStream.on("end", resolve);
      downloadStream.on("error", reject);
    });

    const body = Buffer.concat(chunks);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType ?? "application/octet-stream",
        "Content-Length": body.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Image fetch error:", err);
    return NextResponse.json({ error: "Failed to retrieve image" }, { status: 500 });
  }
}
