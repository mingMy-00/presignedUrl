import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3, BUCKET } from "@/lib/s3";
import { delay, generateCsv, ROW_COUNTS } from "@/lib/excelUtils";

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { range = "1주일" } = await req.json();
  const rowCount = ROW_COUNTS[range] ?? 500;

  // 연결을 유지한 채 모든 작업을 순서대로 처리
  await delay(2000); // DB 쿼리
  await delay(2000); // 데이터 가공
  await delay(1500); // 파일 생성
  const csv = generateCsv(rowCount, range);

  const key = `excel/sync/${uuidv4()}/주문내역_${range}.csv`;
  const fileSizeBytes = Buffer.byteLength(csv, "utf-8");

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(csv, "utf-8"),
      ContentType: "text/csv; charset=utf-8",
    })
  );
  await delay(500); // S3 업로드

  const fileName = encodeURIComponent(`주문내역_${range}.csv`);
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${fileName}`,
    }),
    { expiresIn: 600 }
  );

  return NextResponse.json({
    url,
    key,
    rowCount,
    fileSizeBytes,
    connectionHeldMs: Date.now() - start,
  });
}
