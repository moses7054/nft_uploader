import { NextRequest, NextResponse } from "next/server";
import { getMetadataCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, description, image, attributes, properties } = body;

    if (!name || !image) {
      return NextResponse.json(
        { error: "name and image are required" },
        { status: 400 }
      );
    }

    const metadata = {
      name,
      description: description ?? "",
      image,
      attributes: attributes ?? [],
      properties: properties ?? {
        files: [{ uri: image, type: "image/jpeg" }],
        category: "image",
      },
      createdAt: new Date(),
    };

    const collection = await getMetadataCollection();
    const result = await collection.insertOne(metadata);

    const id = result.insertedId.toString();
    const baseUrl = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const url = `${baseUrl}/api/metadata/${id}`;

    return NextResponse.json({ url, id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Metadata upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
