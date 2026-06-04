"use client";

import { useState } from "react";
import { GuideSection } from "@/components/GuideModal";

const items = [
  {
    aspect: "자격증명 노출",
    presigned: { good: true, text: "AWS 자격증명이 서버에만 존재. 브라우저에 절대 노출 안 됨." },
    proxy: { good: true, text: "AWS 자격증명이 서버에만 존재. 브라우저에 절대 노출 안 됨." },
  },
  {
    aspect: "URL 만료",
    presigned: { good: true, text: "URL에 X-Amz-Expires 포함. 기본 300초 후 자동 만료." },
    proxy: { good: false, text: "서버 API 엔드포인트는 별도 인증 없으면 영구 유효." },
  },
  {
    aspect: "접근 권한 범위",
    presigned: { good: true, text: "특정 버킷/키/작업(PUT/GET)만 허용하는 최소 권한." },
    proxy: { good: false, text: "서버가 S3 전체 접근 권한 보유. 미들웨어 실수 시 전체 노출 위험." },
  },
  {
    aspect: "S3 버킷 공개 설정",
    presigned: { good: true, text: "버킷은 private 유지. 서명된 요청만 허용." },
    proxy: { good: true, text: "버킷은 private 유지. 서버만 접근." },
  },
  {
    aspect: "서버 취약점 영향",
    presigned: { good: true, text: "서버 침해 시 만료된 URL만 문제. 서버 자체는 파일 미보유." },
    proxy: { good: false, text: "서버 침해 시 S3 자격증명 탈취로 전체 버킷 접근 가능." },
  },
  {
    aspect: "CORS 설정 필요",
    presigned: { good: false, text: "브라우저가 직접 S3 PUT 요청 → S3 CORS 설정 필수." },
    proxy: { good: true, text: "브라우저는 서버에만 요청 → CORS 무관." },
  },
  {
    aspect: "서버 메모리 위험",
    presigned: { good: true, text: "파일이 서버 메모리 미통과 → OOM 위험 없음." },
    proxy: { good: false, text: "대용량 파일 업로드 시 서버 메모리 부족(OOM) 위험." },
  },
];

export default function SecurityPanel({ onOpenGuide }: { onOpenGuide?: (s: GuideSection) => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="mb-8 bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">보안 측면 비교</h2>
        {onOpenGuide && (
          <button onClick={() => onOpenGuide("tradeoffs")} className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition border border-zinc-700">
            ⚖️ 장단점 자세히 →
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left py-2 pr-4 w-1/4">항목</th>
              <th className="text-left py-2 pr-4 w-3/8">Presigned URL</th>
              <th className="text-left py-2 w-3/8">Proxy</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={i}
                className="border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <td className="py-3 pr-4 font-medium text-gray-300 text-xs">{item.aspect}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 ${item.presigned.good ? "text-emerald-400" : "text-orange-400"}`}>
                      {item.presigned.good ? "✓" : "✗"}
                    </span>
                    <span className={`text-xs ${expanded === i ? "" : "line-clamp-1"} text-gray-400`}>
                      {item.presigned.text}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 ${item.proxy.good ? "text-emerald-400" : "text-orange-400"}`}>
                      {item.proxy.good ? "✓" : "✗"}
                    </span>
                    <span className={`text-xs ${expanded === i ? "" : "line-clamp-1"} text-gray-400`}>
                      {item.proxy.text}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">행을 클릭하면 상세 설명이 펼쳐집니다.</p>
    </div>
  );
}
