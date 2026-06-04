"use client";

import { UploadResult } from "@/app/page";
import { GuideSection } from "@/components/GuideModal";

type Props = {
  presigned: UploadResult | null;
  proxy: UploadResult | null;
  onOpenGuide?: (s: GuideSection) => void;
};

function Metric({ label, presignedVal, proxyVal, unit, lowerIsBetter = true }: {
  label: string;
  presignedVal: string | number | null;
  proxyVal: string | number | null;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  const pNum = typeof presignedVal === "number" ? presignedVal : null;
  const qNum = typeof proxyVal === "number" ? proxyVal : null;
  const presignedWins = pNum !== null && qNum !== null && (lowerIsBetter ? pNum < qNum : pNum > qNum);
  const proxyWins = pNum !== null && qNum !== null && (lowerIsBetter ? qNum < pNum : qNum > pNum);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 text-center ${presignedWins ? "bg-emerald-900 border border-emerald-600" : "bg-gray-800"}`}>
          <p className="text-xs text-gray-400 mb-1">Presigned</p>
          <p className={`text-lg font-bold ${presignedWins ? "text-emerald-300" : "text-gray-200"}`}>
            {presignedVal !== null ? `${presignedVal}${unit ?? ""}` : "—"}
          </p>
          {presignedWins && <p className="text-xs text-emerald-400 mt-1">✓ 우세</p>}
        </div>
        <div className={`rounded-lg p-3 text-center ${proxyWins ? "bg-emerald-900 border border-emerald-600" : "bg-gray-800"}`}>
          <p className="text-xs text-gray-400 mb-1">Proxy</p>
          <p className={`text-lg font-bold ${proxyWins ? "text-emerald-300" : proxyVal !== null ? "text-orange-300" : "text-gray-200"}`}>
            {proxyVal !== null ? `${proxyVal}${unit ?? ""}` : "—"}
          </p>
          {proxyWins && <p className="text-xs text-emerald-400 mt-1">✓ 우세</p>}
        </div>
      </div>
    </div>
  );
}

export default function MetricsBar({ presigned, proxy, onOpenGuide }: Props) {
  const presignedServerKB = presigned ? Math.round(presigned.serverDataBytes / 1024) : null;
  const proxyServerKB = proxy ? Math.round(proxy.serverDataBytes * 2 / 1024) : null; // 수신 + 재전송

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">실측 비교 지표</h2>
        {onOpenGuide && (
          <button onClick={() => onOpenGuide("performance")} className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition border border-zinc-700">
            ⚡ 성능 비교 원리 →
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="총 소요시간"
          presignedVal={presigned?.totalMs ?? null}
          proxyVal={proxy?.totalMs ?? null}
          unit="ms"
        />
        <Metric
          label="서버 처리시간"
          presignedVal={presigned?.serverProcessingMs ?? null}
          proxyVal={proxy?.serverProcessingMs ?? null}
          unit="ms"
        />
        <Metric
          label="서버 통과 데이터"
          presignedVal={presignedServerKB !== null ? presignedServerKB : null}
          proxyVal={proxyServerKB !== null ? proxyServerKB : null}
          unit="KB"
        />
      </div>

      {presigned && proxy && (
        <div className="mt-4 bg-blue-950 border border-blue-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-blue-300 mb-2 uppercase tracking-wide">요약 분석</h3>
          <div className="grid grid-cols-3 gap-4 text-xs text-blue-200">
            <div>
              <span className="text-gray-400">속도 차이: </span>
              <span className="font-bold text-white">
                {proxy.totalMs > presigned.totalMs
                  ? `Presigned가 ${proxy.totalMs - presigned.totalMs}ms 빠름`
                  : `Proxy가 ${presigned.totalMs - proxy.totalMs}ms 빠름`}
              </span>
            </div>
            <div>
              <span className="text-gray-400">서버 부하 절감: </span>
              <span className="font-bold text-emerald-300">
                {proxy.serverDataBytes > 0
                  ? `${((1 - 0 / (proxy.serverDataBytes * 2)) * 100).toFixed(0)}% 절감`
                  : "동일"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">파일 크기: </span>
              <span className="font-bold text-white">
                {((presigned.fileSize || proxy.fileSize) / 1024).toFixed(1)}KB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
