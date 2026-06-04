"use client";

export default function UserExperiencePanel() {
  return (
    <div className="mb-8 bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
        사용자 입장에서 뭐가 다를까?
      </h2>
      <p className="text-xs text-gray-500 mb-5">
        UI는 똑같이 보이지만, 브라우저 내부(DevTools Network 탭)를 열면 차이가 드러납니다.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Presigned */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Presigned URL</h3>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-2">
            <p className="font-semibold text-gray-300">Network 탭에 보이는 요청</p>
            <div className="font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">POST</span>
                <span className="text-gray-300">/api/presigned/upload</span>
                <span className="text-emerald-400 ml-auto">~0.1KB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">PUT</span>
                <span className="text-gray-300">s3.amazonaws.com/...</span>
                <span className="text-orange-400 ml-auto">파일 크기</span>
              </div>
            </div>
            <p className="text-gray-500">요청 2개. 두 번째 요청 대상이 S3 직접.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">진행률 표시</p>
            <p className="text-gray-400">S3로 전송되는 실제 진행률 실시간 반영 가능</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">대용량 파일 (1GB+)</p>
            <p className="text-emerald-400">서버 메모리 제한 없음. 바로 S3로.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">업로드 속도</p>
            <p className="text-gray-400">내 PC → S3 직결. 서버 대역폭 무관.</p>
          </div>
        </div>

        {/* Proxy */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wide">Proxy</h3>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-2">
            <p className="font-semibold text-gray-300">Network 탭에 보이는 요청</p>
            <div className="font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">POST</span>
                <span className="text-gray-300">/api/proxy/upload</span>
                <span className="text-orange-400 ml-auto">파일 크기</span>
              </div>
            </div>
            <p className="text-gray-500">요청 1개. S3 요청은 사용자 눈에 안 보임.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">진행률 표시</p>
            <p className="text-gray-400">서버 도착까지만 표시. 이후 서버→S3 구간은 <span className="text-orange-400">사용자가 알 수 없음</span> (응답 대기)</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">대용량 파일 (1GB+)</p>
            <p className="text-orange-400">서버 메모리 한계, Next.js 기본 4MB 제한. 별도 설정 필요.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-300">업로드 속도</p>
            <p className="text-gray-400">내 PC → 서버 → S3. <span className="text-orange-400">서버 대역폭이 병목</span>이 될 수 있음.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-blue-950 border border-blue-800 rounded-lg p-3 text-xs text-blue-200">
        <span className="font-bold text-blue-300">핵심 요약: </span>
        사용자 눈에 보이는 UI는 동일하지만, DevTools를 열면 요청 경로가 완전히 다릅니다.
        Presigned는 S3 직결 요청이 보이고, Proxy는 서버 하나만 보입니다.
        대용량 파일일수록 Presigned의 속도·안정성 차이가 두드러집니다.
      </div>
    </div>
  );
}
