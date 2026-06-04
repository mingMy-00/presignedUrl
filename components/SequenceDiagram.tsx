"use client";

import { Step } from "@/app/page";

const ACTORS = ["Browser", "Server", "AWS IAM", "S3"];
const ACTOR_COLORS: Record<string, string> = {
  Browser: "bg-blue-800 text-blue-100",
  Server: "bg-purple-800 text-purple-100",
  "AWS IAM": "bg-yellow-800 text-yellow-100",
  S3: "bg-green-800 text-green-100",
};

type Props = {
  steps: Step[];
  highlight: "presigned" | "proxy";
  dim?: boolean;
};

export default function SequenceDiagram({ steps, highlight, dim }: Props) {
  const isPresigned = highlight === "presigned";

  // Which actors actually appear in these steps
  const usedActors = ACTORS.filter((a) =>
    steps.some((s) => s.from === a || s.to === a)
  );

  const actorIdx = (name: string) => usedActors.indexOf(name);
  const colPct = (idx: number) => `${(idx / (usedActors.length - 1)) * 100}%`;

  return (
    <div className={dim ? "opacity-50" : ""}>
      {/* Actor headers */}
      <div className="relative flex justify-between mb-6">
        {usedActors.map((a) => (
          <div key={a} className={`text-xs font-bold px-2 py-1 rounded ${ACTOR_COLORS[a]}`}>
            {a}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, i) => {
          const isSelf = step.from === step.to;
          const fromIdx = actorIdx(step.from);
          const toIdx = actorIdx(step.to);
          const goRight = toIdx >= fromIdx;
          const isHighlight = step.bytes !== 0 && (step.bytes === -1 || step.bytes > 100);

          const arrowColor = isPresigned
            ? (isHighlight ? "text-emerald-400" : "text-gray-500")
            : (isHighlight ? "text-orange-400" : "text-gray-500");

          const lineColor = isPresigned
            ? (isHighlight ? "bg-emerald-500" : "bg-gray-700")
            : (isHighlight ? "bg-orange-500" : "bg-gray-700");

          const actorPosPct = fromIdx / (usedActors.length - 1) * 100;
          const leftPct = Math.min(fromIdx, toIdx) / (usedActors.length - 1) * 100;
          const rightPct = Math.max(fromIdx, toIdx) / (usedActors.length - 1) * 100;
          const widthPct = rightPct - leftPct;

          if (isSelf) {
            return (
              <div key={i} className="relative">
                <span className="absolute -left-1 -top-1 text-xs text-gray-600 font-mono">{i + 1}</span>
                <div className="pl-2">
                  <div
                    className="inline-flex items-center gap-2 border border-yellow-700 bg-yellow-950 rounded px-3 py-1.5"
                    style={{ marginLeft: `${actorPosPct}%` }}
                  >
                    <span className="text-yellow-400 text-sm">⚙</span>
                    <span className="text-xs text-yellow-300">{step.label}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="relative">
              {/* Sequence number */}
              <span className="absolute -left-1 -top-1 text-xs text-gray-600 font-mono">{i + 1}</span>

              {/* Arrow line */}
              <div className="relative h-6 flex items-center" style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}>
                <div className={`h-0.5 w-full ${lineColor} relative`}>
                  {goRight ? (
                    <span className={`absolute right-0 -top-2 text-sm ${arrowColor}`}>▶</span>
                  ) : (
                    <span className={`absolute left-0 -top-2 text-sm ${arrowColor}`}>◀</span>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="mt-1 text-xs text-gray-400 pl-2 leading-tight">
                <span>{step.label}</span>
                {step.bytes > 0 && (
                  <span className={`ml-2 font-mono font-bold ${isPresigned ? "text-emerald-400" : "text-orange-400"}`}>
                    [{(step.bytes / 1024).toFixed(1)}KB]
                  </span>
                )}
                {step.bytes === -1 && (
                  <span className={`ml-2 font-mono font-bold ${isPresigned ? "text-emerald-400" : "text-orange-400"}`}>
                    [파일 전체]
                  </span>
                )}
                {step.bytes === 0 && (
                  <span className="ml-2 text-gray-600">[데이터 없음]</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Server bypass highlight for presigned */}
      {isPresigned && (
        <div className="mt-4 text-xs text-emerald-400 border border-emerald-900 rounded p-2 bg-emerald-950">
          파일 데이터가 서버를 거치지 않음 → 서버 부하 0
        </div>
      )}
      {!isPresigned && (
        <div className="mt-4 text-xs text-orange-400 border border-orange-900 rounded p-2 bg-orange-950">
          파일이 서버를 2회 통과 (수신 + 재전송) → 서버 메모리·대역폭 2배 소모
        </div>
      )}
    </div>
  );
}
