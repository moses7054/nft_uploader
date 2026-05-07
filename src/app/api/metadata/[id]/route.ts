import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMetadataCollection } from "@/lib/mongodb";

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

    const collection = await getMetadataCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // strip internal fields before returning
    const { _id, createdAt, ...metadata } = doc;
    void _id;
    void createdAt;

    return NextResponse.json(metadata, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Metadata fetch error:", err);
    return NextResponse.json({ error: "Failed to retrieve metadata" }, { status: 500 });
  }
}
