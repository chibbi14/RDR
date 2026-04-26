/**
 * ATC Simulator 座標変換ユーティリティ
 */

export interface Point {
  lat: number;
  lon: number;
  alt?: number;
  id?: string;
  name?: string;
}

export interface MVAArc {
  r: number;
  start?: number;
  end?: number;
  isFull?: boolean;
}

export interface MVARadial {
  deg: number;
  r1: number;
  r2: number;
}

export interface MVALabel {
  alt: string;
  label: { deg: number; r: number };
}

export interface MVASectorResult {
  id: string;
  alt: string;
  r1: number;
  r2: number;
  start: number;
  end: number;
  isFull: boolean;
  label?: { deg: number; r: number };
}

export const ARP: Point = { lat: 35.493333, lon: 133.239167 }; // RJOH
export const NM_TO_PX = 10;
export const LON_CORRECTION = Math.cos(ARP.lat * Math.PI / 180); // 約 0.814

/**
 * 緯度経度をキャンバス座標に変換
 */
export const latLonToCanvas = (lat: number, lon: number, zoom: number, center: { x: number; y: number } = { x: 400, y: 400 }) => {
  const y = -(lat - ARP.lat) * 60 * NM_TO_PX * zoom;
  const x = (lon - ARP.lon) * 60 * LON_CORRECTION * NM_TO_PX * zoom;
  return { x: center.x + x, y: center.y + y };
};

/**
 * 方位と距離から新しい緯度経度を算出 (設計 3.2)
 */
export const calcRelativeLatLon = (lat: number, lon: number, brgDeg: number, distNM: number): Point => {
  const brg = (brgDeg * Math.PI) / 180;
  const newLat = lat + (distNM * Math.cos(brg)) / 60;
  const newLon = lon + (distNM * Math.sin(brg)) / (60 * Math.cos((lat * Math.PI) / 180));
  return { lat: newLat, lon: newLon };
};

/**
 * 2つの点とそれぞれの方位から交点を算出 (設計 3.2)
 */
export const getIntercept = (p1: Point | null, hdg1: number, p2: Point | null, hdg2: number): Point => {
  if (!p1 || !p2) return { lat: ARP.lat, lon: ARP.lon };
  const x1 = (p1.lon - ARP.lon) * 60 * LON_CORRECTION;
  const y1 = (p1.lat - ARP.lat) * 60;
  const x2 = (p2.lon - ARP.lon) * 60 * LON_CORRECTION;
  const y2 = (p2.lat - ARP.lat) * 60;
  const r1 = (90 - hdg1) * Math.PI / 180;
  const r2 = (90 - hdg2) * Math.PI / 180;
  const m1 = Math.abs(Math.cos(r1)) < 0.0001 ? 1e6 : Math.tan(r1);
  const m2 = Math.abs(Math.cos(r2)) < 0.0001 ? 1e6 : Math.tan(r2);
  if (Math.abs(m1 - m2) < 0.0001) return { lat: p1.lat, lon: p1.lon };
  const x = (y2 - y1 + m1 * x1 - m2 * x2) / (m1 - m2);
  const y = y1 + m1 * (x - x1);
  return { 
    lat: ARP.lat + (y / 60), 
    lon: ARP.lon + (x / (60 * LON_CORRECTION)) 
  };
};

export const dmsToDeg = (dmsStr: string | number | undefined): number => {
  if (!dmsStr) return 0;
  const s = dmsStr.toString().replace(/[NSEW]/g, "");
  const match = s.match(/(\d{2,3})(\d{2})(\d{2}\.\d+|\d{2})/);
  if (!match) return 0;
  const deg = parseFloat(match[1] || "0");
  const min = parseFloat(match[2] || "0");
  const sec = parseFloat(match[3] || "0");
  return deg + min / 60 + sec / 3600;
};

/**
 * MVAの境界データとラベルから、3Dメッシュ生成用のセクタ情報を動的に計算する
 */
export const computeMVASectors = (
  rings: number[], 
  radials: MVARadial[], 
  arcs: MVAArc[], 
  labels: MVALabel[]
): MVASectorResult[] => {
  if (!labels || labels.length === 0) return [];

  // 全ての境界円（リングと円弧）を統合
  const allArcs: MVAArc[] = [
    ...(rings || []).map(r => ({ r, isFull: true })),
    ...(arcs || [])
  ];

  return labels.map((l, idx) => {
    const { deg, r } = l.label;
    
    // 角度が範囲内か判定するヘルパー (0-360跨ぎ対応)
    const isAngleBetween = (val: number, start: number, end: number) => {
      const s = (start + 360) % 360;
      const e = (end + 360) % 360;
      const v = (val + 360) % 360;
      return s < e ? (v >= s && v <= e) : (v >= s || v <= e);
    };

    // 1. 半径方向の境界を特定 (ラベル位置の角度をカバーしている円弧から探す)
    const relevantArcs = allArcs.filter(a => a.isFull || (a.start !== undefined && a.end !== undefined && isAngleBetween(deg, a.start, a.end)));
    const r1 = relevantArcs.filter(a => a.r <= r).reduce((max, a) => Math.max(max, a.r), 0);
    const r2 = relevantArcs.filter(a => a.r > r).reduce((min, a) => Math.min(min, a.r), rings[rings.length - 1] || 50);

    // 2. 角度方向の境界を特定 (ラベルの半径を跨いでいるラジアル線から探す)
    const relevantRadials = radials.filter(rad => r >= rad.r1 && r <= rad.r2);
    let bestStart = 0;
    let bestEnd = 360;
    let minDiffStart = 360;
    let minDiffEnd = 360;

    relevantRadials.forEach(rad => {
      const d = (rad.deg + 360) % 360;
      const target = (deg + 360) % 360;
      const diffCW = (d - target + 360) % 360;  // 右側の境界
      const diffCCW = (target - d + 360) % 360; // 左側の境界
      if (diffCW > 0 && diffCW < minDiffEnd) { minDiffEnd = diffCW; bestEnd = d; }
      if (diffCCW > 0 && diffCCW < minDiffStart) { minDiffStart = diffCCW; bestStart = d; }
    });

    return {
      id: `MVA-SEC-${idx}`,
      alt: l.alt,
      r1, r2,
      start: bestStart,
      end: bestEnd,
      isFull: (minDiffStart === 360 && minDiffEnd === 360),
      label: l.label
    };
  });
};