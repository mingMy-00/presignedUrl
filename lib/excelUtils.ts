export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const ROW_COUNTS: Record<string, number> = {
  "1주일": 500,
  "1개월": 2000,
  "3개월": 6000,
};

export function generateCsv(rowCount: number, range: string): string {
  const header = "주문번호,주문일자,상품명,카테고리,수량,단가(₩),금액(₩),상태";
  const products = [
    "탑텐 기본 티셔츠", "올젠 슬랙스", "지오지아 자켓",
    "앤드지 청바지", "에디션 원피스", "탑텐밸런스 레깅스",
  ];
  const categories = ["상의", "하의", "아우터", "원피스", "스포츠"];
  const statuses = ["배송완료", "배송중", "주문확인", "취소"];
  const daysBack = range === "1주일" ? 7 : range === "1개월" ? 30 : 90;

  const rows = Array.from({ length: rowCount }, (_, i) => {
    const msBack = Math.floor((i / rowCount) * daysBack * 24 * 60 * 60 * 1000);
    const date = new Date(Date.now() - msBack).toISOString().slice(0, 10);
    const product = products[i % products.length];
    const category = categories[i % categories.length];
    const qty = (i % 5) + 1;
    const price = ((i % 50) + 10) * 1000;
    const status = statuses[i % statuses.length];
    return `ORD-${String(i + 1).padStart(6, "0")},${date},${product},${category},${qty},${price},${qty * price},${status}`;
  });

  return "﻿" + header + "\n" + rows.join("\n");
}
