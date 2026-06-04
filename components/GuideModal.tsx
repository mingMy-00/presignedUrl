"use client";

import { useState, useEffect } from "react";

export type GuideSection =
  | "problem" | "solutions" | "what" | "features"
  | "hmac" | "url-anatomy" | "performance" | "lambda" | "tradeoffs";

const NAV: { id: GuideSection; title: string; icon: string }[] = [
  { id: "problem",      title: "문제 정의",          icon: "🔒" },
  { id: "solutions",    title: "해결 방법 4가지",     icon: "🗂️" },
  { id: "what",         title: "Pre-Signed URL이란?", icon: "🔗" },
  { id: "features",     title: "4가지 특징",          icon: "✨" },
  { id: "hmac",         title: "HMAC 서명 원리",      icon: "🔐" },
  { id: "url-anatomy",  title: "URL 구조 해부",       icon: "🔬" },
  { id: "performance",  title: "성능 비교",           icon: "⚡" },
  { id: "lambda",       title: "Lambda & 서버리스",   icon: "☁️" },
  { id: "tradeoffs",    title: "장단점",              icon: "⚖️" },
];

// ── 재사용 컴포넌트 ──────────────────────────────────────
function T({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`font-bold ${c}`}>{children}</span>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-emerald-300 border-b border-emerald-900 pb-1 mb-3 tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-300 text-sm leading-relaxed mb-3">{children}</p>;
}
function Li({ marker = "▸", children }: { marker?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm text-zinc-300 mb-1.5">
      <span className="text-emerald-400 shrink-0 mt-px">{marker}</span>
      <span>{children}</span>
    </div>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 font-mono text-xs text-emerald-300 leading-relaxed mb-3 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}
function Callout({ color, children }: { color: "yellow" | "blue" | "red"; children: React.ReactNode }) {
  const c = color === "yellow" ? "border-yellow-500 text-yellow-200"
          : color === "blue"   ? "border-blue-500 text-blue-200"
                               : "border-red-500 text-red-200";
  return (
    <div className={`border-l-4 bg-zinc-800 rounded px-3 py-2 mb-3 text-sm ${c}`}>
      {children}
    </div>
  );
}

// ── 각 섹션 컨텐츠 ──────────────────────────────────────
const CONTENT: Record<GuideSection, React.ReactNode> = {

  problem: (
    <>
      <Sec title="왜 이 문제가 생기는가?">
        <P>AWS S3에 파일을 올려두면 기본적으로 외부에서 접근할 수 없습니다. 버킷은 <T c="text-red-400">프라이빗 상태</T>이고, S3는 요청자가 누구인지 증명하도록 요구합니다.</P>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">사용자</span>
            <span className="text-zinc-600">──GET──▶</span>
            <span className="text-green-400">S3 (Private)</span>
            <span className="text-zinc-600">──▶</span>
            <span className="text-red-400 font-bold">403 AccessDenied ✗</span>
          </div>
        </div>
      </Sec>
      <Sec title="실제 마주치는 상황">
        <Callout color="yellow">
          "이 파일을 특정 사람한테 잠깐 보여줘야 하는데, 내 AWS 키를 줄 순 없잖아?"
        </Callout>
        <P>이 문제를 해결하는 방법이 4가지 있고, <T c="text-emerald-400">Pre-Signed URL</T>은 그 중 가장 실용적인 선택지입니다.</P>
      </Sec>
    </>
  ),

  solutions: (
    <>
      <Sec title="S3 접근을 허용하는 4가지 방법">
        <div className="space-y-3">
          {([
            { num: "1", title: "버킷을 퍼블릭으로 변경",   desc: "누구나 URL만 알면 접근 가능. 민감한 파일이라면 절대 금물.",                       border: "border-red-800 bg-red-950",     badge: "❌ 보안 위험",   bc: "text-red-400" },
            { num: "2", title: "IAM 사용자/역할 부여",      desc: "AWS 계정을 상대방에게 직접 만들어줘야 함. 외부 사용자에게는 부적합.",              border: "border-red-800 bg-red-950",     badge: "❌ 비현실적",   bc: "text-red-400" },
            { num: "3", title: "서버가 파일을 프록시로 전달", desc: "서버가 S3에서 파일을 받아 사용자에게 전달. 파일이 서버를 2번 통과 → 서버 부하.", border: "border-orange-800 bg-orange-950", badge: "⚠️ 서버 부하", bc: "text-orange-400" },
            { num: "4", title: "Pre-Signed URL 발급",       desc: "서버가 임시 서명 URL만 발급. 파일은 사용자↔S3 직결. 만료 시간으로 자동 회수.",   border: "border-emerald-800 bg-emerald-950", badge: "✅ 권장",   bc: "text-emerald-400" },
          ] as const).map((item) => (
            <div key={item.num} className={`border rounded-lg p-3 ${item.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-zinc-500 font-mono">방법 {item.num}</span>
                  <p className="font-semibold text-zinc-200 text-sm">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${item.bc}`}>{item.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </Sec>
    </>
  ),

  what: (
    <>
      <Sec title="정의">
        <div className="bg-zinc-800 border border-emerald-800 rounded-lg p-4 mb-4">
          <p className="text-emerald-200 text-sm leading-relaxed font-medium">
            private 객체에 대해 <T c="text-yellow-300">제한된 시간 동안</T> 특정 HTTP 요청을 허용하도록 <T c="text-yellow-300">서명된 URL</T>.
          </p>
        </div>
        <P>일반적으로 S3에 저장된 파일은 private 상태로 두고, 애플리케이션 서버가 사용자의 권한을 검증한 뒤 필요한 경우에만 임시 접근 URL을 발급합니다.</P>
      </Sec>
      <Sec title="핵심 — 서버가 파일을 중계하지 않는다">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-orange-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-bold mb-2">기존 방식 (Proxy)</p>
            <div className="font-mono text-xs text-zinc-300 space-y-1">
              <div>① Client <span className="text-orange-400">─[파일]──▶</span> Server</div>
              <div>② Server <span className="text-orange-400">─[파일]──▶</span> S3</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-emerald-800 rounded-lg p-3">
            <p className="text-emerald-400 text-xs font-bold mb-2">Pre-Signed URL</p>
            <div className="font-mono text-xs text-zinc-300 space-y-1">
              <div>① Client <span className="text-emerald-400">─[URL요청]──▶</span> Server</div>
              <div>② Server <span className="text-emerald-400">─[서명URL]──▶</span> Client</div>
              <div>③ Client <span className="text-emerald-400">─[파일]──▶</span> S3</div>
            </div>
          </div>
        </div>
      </Sec>
    </>
  ),

  features: (
    <>
      <Sec title="4가지 핵심 특징">
        <div className="space-y-3">
          {([
            { icon: "🔑", title: "생성자의 권한을 URL에 위임",    desc: "URL을 만든 사람(또는 역할)이 해당 파일에 대한 접근 권한을 갖고 있어야만 URL을 발급할 수 있습니다. 권한 없는 사람은 URL도 못 만듭니다." },
            { icon: "⏱️", title: "만료 시간 내장",               desc: "URL 파라미터에 만료 시각이 포함되어 있고, S3가 요청 시점에 이를 검증합니다. 기간이 지나면 같은 URL로 재접근해도 403 오류가 반환됩니다." },
            { icon: "🌐", title: "HTTP 기반 — SDK 불필요",        desc: "AWS SDK, IAM 없이 브라우저나 curl, 어떤 HTTP 클라이언트로도 사용 가능합니다. 인증 처리가 URL 안에 이미 포함되어 있기 때문입니다." },
            { icon: "🛡️", title: "위변조 불가",                  desc: "URL의 어떤 파라미터를 바꾸면 서명 검증이 실패합니다. 만료 시각을 마음대로 늘리거나 파일 경로를 바꿀 수 없습니다." },
          ] as const).map((f, i) => (
            <div key={i} className="flex gap-3 bg-zinc-900 rounded-lg p-3 border border-zinc-700">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">{i + 1}. {f.title}</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Sec>
    </>
  ),

  hmac: (
    <>
      <Sec title="HMAC이란?">
        <P><T c="text-yellow-300">HMAC (Hash-based Message Authentication Code)</T> — 메시지가 특정 Secret Key를 가진 사람에 의해 생성되었음을 증명하는 방식입니다.</P>
      </Sec>
      <Sec title="서명 생성 과정 (서버 내부)">
        <Code>{`"AWS4" + SecretKey
    ↓  HMAC(날짜)
DateKey
    ↓  HMAC("ap-northeast-2")
DateRegionKey
    ↓  HMAC("s3")
DateRegionServiceKey
    ↓  HMAC("aws4_request")
SigningKey
    ↓  HMAC(버킷명 + 경로 + 만료시각 + HTTP메서드 + ...)
X-Amz-Signature  ← URL에 붙는 최종 서명값`}</Code>
        <P>이 계산은 <T c="text-emerald-400">서버 메모리 안에서만 실행</T>됩니다. AWS IAM에 네트워크 요청을 보내지 않습니다.</P>
      </Sec>
      <Sec title="S3가 검증하는 방법">
        <Li>S3는 AccessKeyID로 해당 계정의 SecretKey를 조회</Li>
        <Li>동일한 HMAC 계산을 자체적으로 수행</Li>
        <Li>결과값 == X-Amz-Signature → <T c="text-emerald-400">허용</T></Li>
        <Li marker="✗">결과값 ≠ X-Amz-Signature → <T c="text-red-400">403 거부</T></Li>
        <Li marker="✗">X-Amz-Expires 초과 → <T c="text-red-400">403 거부</T></Li>
      </Sec>
      <Callout color="yellow">
        SecretKey는 서버에만 존재하고 URL에 노출되지 않습니다. S3도 알고 있어서 검증 가능하고, 제3자는 SecretKey 없이 유효한 서명을 위조할 수 없습니다.
      </Callout>
    </>
  ),

  "url-anatomy": (
    <>
      <Sec title="실제 URL을 뜯어봅시다">
        <Code>{`https://my-bucket.s3.ap-northeast-2.amazonaws.com/reports/q3.pdf
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIAIOSFODNN7EXAMPLE
      %2F20240901%2Fap-northeast-2%2Fs3%2Faws4_request
  &X-Amz-Date=20240901T120000Z
  &X-Amz-Expires=3600
  &X-Amz-SignedHeaders=host
  &X-Amz-Signature=fe5f80f77d5fa3beca...`}</Code>
      </Sec>
      <Sec title="각 파라미터 의미">
        <div className="space-y-2 text-xs">
          {([
            { key: "X-Amz-Algorithm",     val: "AWS4-HMAC-SHA256",        desc: "사용된 서명 알고리즘" },
            { key: "X-Amz-Credential",    val: "AKIA... / 날짜 / 리전 / s3", desc: "서명에 사용된 키 + 범위" },
            { key: "X-Amz-Date",          val: "20240901T120000Z",         desc: "서명이 생성된 시각 (UTC)" },
            { key: "X-Amz-Expires",       val: "3600 (초)",                desc: "발급 시각으로부터의 유효 시간" },
            { key: "X-Amz-SignedHeaders", val: "host",                     desc: "서명에 포함된 헤더 목록" },
            { key: "X-Amz-Signature",     val: "fe5f80f7...",              desc: "HMAC-SHA256 최종 서명값" },
          ] as const).map((r) => (
            <div key={r.key} className="flex gap-2 items-start border-b border-zinc-800 pb-2">
              <span className="font-mono text-purple-400 w-44 shrink-0">{r.key}</span>
              <span className="font-mono text-emerald-400 flex-1">{r.val}</span>
              <span className="text-zinc-500 w-36 shrink-0 text-right">{r.desc}</span>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="위변조가 불가능한 이유">
        <P><code className="text-orange-400 bg-zinc-800 px-1 rounded">X-Amz-Expires=3600</code>을 URL에서 직접 수정하면 <code className="text-orange-400 bg-zinc-800 px-1 rounded">X-Amz-Signature</code>와 불일치가 발생해 S3가 거부합니다. 수정된 값으로 서명값을 다시 만들려면 SecretKey가 필요하므로 사실상 불가능합니다.</P>
      </Sec>
    </>
  ),

  performance: (
    <>
      <Sec title="서버를 안 거치면 뭐가 달라지는가?">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-900 border border-orange-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-bold mb-2">기존 방식 (Proxy)</p>
            <div className="text-xs text-zinc-300 font-mono space-y-1">
              <div>Client <span className="text-orange-400">─[파일]→</span> Server</div>
              <div>Server <span className="text-orange-400">─[파일]→</span> S3</div>
            </div>
            <p className="text-xs text-orange-300 mt-2 font-semibold">100MB 파일 = 서버가 200MB 처리</p>
          </div>
          <div className="bg-zinc-900 border border-emerald-800 rounded-lg p-3">
            <p className="text-emerald-400 text-xs font-bold mb-2">Pre-Signed URL</p>
            <div className="text-xs text-zinc-300 font-mono space-y-1">
              <div>Client <span className="text-emerald-400">─[URL]→</span> Server</div>
              <div>Client <span className="text-emerald-400">─[파일]→</span> S3</div>
            </div>
            <p className="text-xs text-emerald-300 mt-2 font-semibold">100MB 파일 = 서버 처리 0MB</p>
          </div>
        </div>
        <P>Pre-Signed URL의 가치는 보안에 그치지 않습니다. 파일이 서버를 경유하지 않는다는 사실 자체가 아키텍처적으로 큰 차이를 만듭니다.</P>
      </Sec>
      <Sec title="실측 차이 포인트">
        <Li>서버 통과 데이터: <T c="text-emerald-400">0KB</T> vs 파일크기 × 2</Li>
        <Li>서버 처리시간: 서명 계산만 (수십ms) vs 파일 전체 수신+재전송</Li>
        <Li>동시 업로드: 서버 대역폭 무관, S3가 직접 받음</Li>
        <Li>대용량 파일: 서버 메모리 한계 없음</Li>
      </Sec>
    </>
  ),

  lambda: (
    <>
      <Sec title="Lambda에서 특히 중요한 이유">
        <P>Lambda는 메모리가 최대 <T c="text-yellow-300">10GB</T>로 제한되며, 실행 시간에 비례해 비용이 청구됩니다.</P>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-900 border border-red-800 rounded-lg p-3">
            <p className="text-red-400 text-xs font-bold mb-2">Lambda에서 직접 수신 시</p>
            <Li marker="✗">파일 크기만큼 메모리 사용</Li>
            <Li marker="✗">전송 시간 내내 Lambda 실행 → 비용↑</Li>
            <Li marker="✗">10GB+ 파일 처리 불가</Li>
          </div>
          <div className="bg-zinc-900 border border-emerald-800 rounded-lg p-3">
            <p className="text-emerald-400 text-xs font-bold mb-2">Pre-Signed URL 사용 시</p>
            <Li>URL 발급만 하고 즉시 종료</Li>
            <Li>100ms 이내 완료 가능</Li>
            <Li>파일 크기 제한 없음</Li>
          </div>
        </div>
      </Sec>
      <Sec title="Serverless Direct Upload 패턴">
        <Code>{`① Client → Lambda  : URL 요청  (Lambda → 100ms 후 종료)
② Client → S3      : 파일 직접 업로드  (Lambda 개입 없음)
③ S3    → Lambda   : Event Notification (업로드 완료 이벤트)`}</Code>
        <Callout color="blue">
          서버가 파일의 존재조차 모르는 채로 업로드가 완료됩니다. 이 패턴을 <strong>Serverless Direct Upload</strong>라고 부릅니다.
        </Callout>
      </Sec>
    </>
  ),

  tradeoffs: (
    <>
      <Sec title="단점">
        <div className="space-y-2 mb-2">
          <div className="bg-red-950 border border-red-800 rounded-lg p-3">
            <p className="text-red-300 text-sm font-semibold">URL 탈취 시 만료 전까지 누구나 접근 가능</p>
            <p className="text-zinc-400 text-xs mt-1">만료 시간을 짧게 설정하거나 IP 제한 조건을 추가하는 방식으로 위험을 줄일 수 있습니다.</p>
          </div>
          <div className="bg-red-950 border border-red-800 rounded-lg p-3">
            <p className="text-red-300 text-sm font-semibold">서버에서 파일 검증 (바이러스 스캔 등) 불가</p>
            <p className="text-zinc-400 text-xs mt-1">파일이 서버를 거치지 않으므로 직접 검사할 수 없습니다. S3 Event → Lambda를 통해 업로드 후 별도 검사하는 구조를 따로 만들어야 합니다.</p>
          </div>
        </div>
      </Sec>
      <Sec title="장점">
        <div className="space-y-2">
          {([
            { title: "만료 시간으로 자동 권한 회수",       desc: "별도 토큰 폐기 로직 없이 시간이 지나면 자동 무효화" },
            { title: "업로드 & 다운로드 모두 지원",        desc: "PUT / GET 각각 서명 가능" },
            { title: "서버 부하 없이 대용량 파일 처리",    desc: "서버 메모리·대역폭 소모 없음, 10GB+ 파일도 가능" },
            { title: "AWS 계정 없이 파일 접근 가능",       desc: "URL만 있으면 브라우저, curl 등 어디서든 접근" },
          ] as const).map((item) => (
            <div key={item.title} className="flex gap-2 bg-emerald-950 border border-emerald-800 rounded-lg p-3">
              <span className="text-emerald-400 shrink-0 font-bold">✓</span>
              <div>
                <p className="text-emerald-200 text-sm font-semibold">{item.title}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Sec>
    </>
  ),
};

// ── 메인 모달 컴포넌트 ──────────────────────────────────
type Props = {
  open: boolean;
  initialSection?: GuideSection;
  onClose: () => void;
};

export default function GuideModal({ open, initialSection = "problem", onClose }: Props) {
  const [current, setCurrent] = useState<GuideSection>(initialSection);
  const [animKey, setAnimKey] = useState(0);

  const idx = NAV.findIndex((n) => n.id === current);

  useEffect(() => {
    if (open) setCurrent(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [current]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && NAV[idx + 1]) setCurrent(NAV[idx + 1].id);
      if (e.key === "ArrowLeft"  && NAV[idx - 1]) setCurrent(NAV[idx - 1].id);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, idx, onClose]);

  if (!open) return null;

  const nav = NAV[idx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[82vh] bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl flex overflow-hidden"
           style={{ animation: "guideSlideIn 0.25s ease forwards" }}>

        {/* 왼쪽 사이드바 */}
        <div className="w-48 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">개념 가이드</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrent(item.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 transition
                  ${current === item.id
                    ? "bg-emerald-900 text-emerald-200 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="leading-tight">{item.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{nav?.icon}</span>
              <h2 className="text-lg font-bold text-emerald-300 tracking-tight">{nav?.title}</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-600">{idx + 1} / {NAV.length}  ·  ← → 키로 이동</span>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800">✕</button>
            </div>
          </div>

          {/* 본문 */}
          <div
            key={animKey}
            className="flex-1 overflow-y-auto px-6 py-5"
            style={{ animation: "guideSlideIn 0.3s ease forwards" }}
          >
            {CONTENT[current]}
          </div>

          {/* 하단 네비게이션 */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 shrink-0">
            <button
              onClick={() => NAV[idx - 1] && setCurrent(NAV[idx - 1].id)}
              disabled={idx === 0}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition"
            >← 이전</button>

            <div className="flex gap-1.5">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrent(item.id)}
                  className={`w-2 h-2 rounded-full transition ${current === item.id ? "bg-emerald-400 scale-125" : "bg-zinc-700 hover:bg-zinc-500"}`}
                />
              ))}
            </div>

            <button
              onClick={() => NAV[idx + 1] && setCurrent(NAV[idx + 1].id)}
              disabled={idx === NAV.length - 1}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition"
            >다음 →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
