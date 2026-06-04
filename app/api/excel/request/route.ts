import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3, BUCKET } from "@/lib/s3";
import { createJob, updateJob } from "@/lib/jobStore";
import { delay, generateCsv, ROW_COUNTS } from "@/lib/excelUtils";

async function processExcelJob(jobId: string, range: string) {
  const rowCount = ROW_COUNTS[range] ?? 500;
  try {
    updateJob(jobId, {
      status: "processing",
      progress: 10,
      message: `DB에서 주문내역 ${rowCount.toLocaleString()}건 조회 중...`,
    });
    await delay(2000);

    updateJob(jobId, { progress: 35, message: "데이터 집계 및 가공 중..." });
    await delay(2000);

    updateJob(jobId, { progress: 60, message: `엑셀 파일 생성 중 (${rowCount.toLocaleString()}행)...` });
    const csv = generateCsv(rowCount, range);
    await delay(1500);

    updateJob(jobId, { progress: 80, message: "S3에 파일 업로드 중..." });
    const key = `excel/${jobId}/주문내역_${range}.csv`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(csv, "utf-8"),
        ContentType: "text/csv; charset=utf-8",
      })
    );
    await delay(500);

    updateJob(jobId, { progress: 95, message: "Pre-Signed 다운로드 URL 발급 중..." });
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

    updateJob(jobId, {
      status: "done",
      progress: 100,
      message: "완료",
      downloadUrl: url,
      key,
      rowCount,
    });
  } catch (e) {
    updateJob(jobId, { status: "error", message: String(e) });
  }
}

export async function POST(req: NextRequest) {
  const { range = "1주일" } = await req.json();
  const jobId = uuidv4();
  createJob(jobId, range);

  void processExcelJob(jobId, range);

  return NextResponse.json({ jobId, range });
}
