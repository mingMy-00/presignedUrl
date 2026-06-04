import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const arrayBuffer = await res.Body!.transformToByteArray();
  const bytes = Buffer.from(arrayBuffer);

  const serverProcessingMs = Date.now() - start;

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": res.ContentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
      "X-Server-Processing-Ms": String(serverProcessingMs),
      "X-Server-Data-Bytes": String(bytes.length),
    },
  });
}
