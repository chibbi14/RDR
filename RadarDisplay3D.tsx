import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ARP, LON_CORRECTION, computeMVASectors, Point, MVASectorResult } from './geoUtils';
import { 
  AIRPORTS, VOR_DME, FIXES, AIRWAYS, RNAV_ROUTES, DIRECT_ROUTES, PROCEDURES,
  MVA_MANUAL_ARCS, MVA_MANUAL_RADIALS, MVA_RINGS, MVA_LABELS,
  MVA_COMPLEX_SECTORS,
  PathSegment
} from './navigationData';
// Import the terrain creation function
import { createTerrainMesh } from './createTerrain';

const SCALE_3D = 1; // 1NM = 1 unit in 3D
const ALT_BASE_FACTOR = 0.0005; 

// MVAの高度表記（25 -> 2500）を変換するヘルパー
const getNormalizedAlt = (alt: string | number): number => {
  const val = typeof alt === 'string' ? parseFloat(alt) : alt;
  return val < 1000 ? val * 100 : val;
};

interface TerrainProps {
  isVisible: boolean;
  verticalScale: number;
}

// New component to load and display the terrain
const TerrainComponent: React.FC<TerrainProps> = ({ isVisible, verticalScale }) => {
  const [terrainGroup, setTerrainGroup] = useState<THREE.Group | null>(null);
  const [currentMeshMaxAltNM, setCurrentMeshMaxAltNM] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // まだロードされていないか、verticalScale が変更された場合に地形をロード/再ロード
      const firstChild = terrainGroup?.children[0] as THREE.Mesh;
      const material = firstChild?.material as THREE.MeshStandardMaterial;
      const needsReload = !terrainGroup || (firstChild && material?.displacementScale !== (currentMeshMaxAltNM * verticalScale));

      if (needsReload) {
        createTerrainMesh(verticalScale).then(({ terrainGroup: newGroup, meshMaxAltNM: newMeshMaxAltNM }) => {
          setTerrainGroup(newGroup);
          setCurrentMeshMaxAltNM(newMeshMaxAltNM);
        }).catch(error => {
          console.error("Failed to load terrain:", error);
        });
      }
    }
  }, [isVisible, terrainGroup, verticalScale, currentMeshMaxAltNM]); // 依存配列にcurrentMeshMaxAltNMを追加

  // Render the loaded THREE.Mesh using <primitive>
  return isVisible && terrainGroup ? <primitive object={terrainGroup} /> : null;
};

const CoordinateGrid = () => (
  <gridHelper args={[200, 20, 0x334155, 0x1e293b]} rotation={[0, 0, 0]} />
);

interface MVAComplexSectorMeshProps {
  id: string;
  alt: string;
  centerId?: string;
  path: PathSegment[];
  label?: { deg: number; r: number };
  altScale: number;
  getPos3D: (tgt: string | Point) => { x_3d: number; y_3d: number; z_3d: number };
}

// 基準点オフセットと任意経路（Arc/Line）に対応したMVAセクタ
const MVAComplexSectorMesh: React.FC<MVAComplexSectorMeshProps> = ({ alt, centerId = 'ARP', path, label, altScale, getPos3D }) => {
  const normalizedAlt = getNormalizedAlt(alt);
  const yPos = normalizedAlt * altScale;
  const centerPos = getPos3D(centerId);

  const borderPoints = useMemo(() => {
    const pts = [];
    if (path.length === 0) return pts;

    // 開始点を追加
    const first = path[0];
    const startAngle = ((first.type === 'arc' ? first.start : first.deg) - 90) * Math.PI / 180;
    pts.push([Math.cos(startAngle) * first.r, 0, Math.sin(startAngle) * first.r]); // Removed LON_CORRECTION

    path.forEach(seg => {
      if (seg.type === 'line') {
        const rad = (seg.deg - 90) * Math.PI / 180;
         pts.push([Math.cos(rad) * seg.r, 0, Math.sin(rad) * seg.r]); // Removed LON_CORRECTION
       } else {
        const steps = 32;
        let sR = (seg.start - 90) * Math.PI / 180;
        let eR = (seg.end - 90) * Math.PI / 180;
        const delta = (seg.end - seg.start + 360) % 360;
        const isAviationCW = delta < 180;
        
        // 補間方向の調整: 航空CWなら数学CCW(eR > sR)へ
        if (isAviationCW && eR <= sR) eR += Math.PI * 2;
        if (!isAviationCW && sR <= eR) sR += Math.PI * 2;

        for(let i=1; i<=steps; i++) {
          const a = sR + (eR - sR) * (i/steps);
          pts.push([Math.cos(a) * seg.r, 0, Math.sin(a) * seg.r] as [number, number, number]); // Removed LON_CORRECTION
        }
      }
    });
    pts.push(pts[0]);
    return pts;
  }, [path]);

  // borderPointsのロジックを流用して、メッシュの表面（Shape）を生成する
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (borderPoints.length < 3) return s;

    // 垂直な壁や境界線に使用しているポイントをそのまま順に繋ぐ
    // これにより、境界線とメッシュが1ピクセルのズレもなく完全に一致する
    // rotation=[-Math.PI/2, 0, 0] による North-South 反転を補正するため Z を反転
    s.moveTo(borderPoints[0][0], -borderPoints[0][2]);
    for (let i = 1; i < borderPoints.length; i++) {
      s.lineTo(borderPoints[i][0], -borderPoints[i][2]);
    }
    s.closePath();
    return s;
  }, [borderPoints]);

  const wallGeometry = useMemo(() => {
    const vertices = [];
    const indices = [];
    for (let i = 0; i < borderPoints.length - 1; i++) {
      const p1 = borderPoints[i]; const p2 = borderPoints[i+1];
      const base = vertices.length / 3;
      vertices.push(p1[0], 0, p1[2], p2[0], 0, p2[2], p1[0], yPos, p1[2], p2[0], yPos, p2[2]);
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    return geom;
  }, [borderPoints, yPos]);

  // 高度ラベルの配置位置
  const labelPos = useMemo(() => {
    // 1. 手動設定(label)がある場合はそれを優先（deg, r を 3D 座標に変換）
    if (label) {
      const rad = (label.deg - 90) * Math.PI / 180;
      return [Math.cos(rad) * label.r, 1.5, Math.sin(rad) * label.r] as [number, number, number];
    }

    // 2. 面積重心の計算
    if (borderPoints.length < 3) return [0, 1.5, 0] as [number, number, number];
    
    // 面積重心（Centroid of Area）を計算して凹型図形でも内部に収まるようにする
    let area = 0;
    let cx = 0;
    let cz = 0;
    
    for (let i = 0; i < borderPoints.length - 1; i++) {
      const p1 = borderPoints[i];
      const p2 = borderPoints[i + 1];
      const crossProduct = p1[0] * p2[2] - p2[0] * p1[2];
      area += crossProduct;
      cx += (p1[0] + p2[0]) * (crossProduct || 0);
      cz += (p1[2] + p2[2]) * crossProduct;
    }
    
    area /= 2;
    if (Math.abs(area) < 0.01) {
      // 図形が潰れている場合のフォールバック
      return [borderPoints[0][0], 1.5, borderPoints[0][2]] as [number, number, number];
    }
    
    return [cx / (6 * area), 1.5, cz / (6 * area)] as [number, number, number];
  }, [borderPoints, label]);

  return (
    <group position={[centerPos.x_3d, yPos, centerPos.z_3d]} scale={[LON_CORRECTION, 1, 1]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <shapeGeometry args={[shape, 32]} />
        <meshBasicMaterial 
          color="#00d5ff" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} 
        />
      </mesh>
      <Line points={borderPoints} color="#13f3d9" lineWidth={0.5} opacity={0.6} transparent />
      
      {/* 垂直な壁の追加 */}
      <mesh position={[0, -yPos, 0]} geometry={wallGeometry} renderOrder={2}>
        <meshBasicMaterial color="#00bfff" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <Text 
        position={labelPos} fontSize={1.2} color="#00fff7" rotation={[-Math.PI/2, 0, 0]} 
        opacity={0.8} transparent textAlign="center"
      >
        {alt}
      </Text>
    </group>
  );
};

// MVAのグリッド（円弧とラジアル線）を表示するコンポーネント
const MVAGrid3D = () => {
  return (
    <group>
      {/* ラジアル線の描画 */}
      {MVA_MANUAL_RADIALS.map((r, i) => {
        const x1 = r.r1 * Math.cos((r.deg - 90) * Math.PI / 180) * SCALE_3D * LON_CORRECTION;
        const z1 = r.r1 * Math.sin((r.deg - 90) * Math.PI / 180) * SCALE_3D;
        const x2 = r.r2 * Math.cos((r.deg - 90) * Math.PI / 180) * SCALE_3D * LON_CORRECTION;
        const z2 = r.r2 * Math.sin((r.deg - 90) * Math.PI / 180) * SCALE_3D;
        return <Line key={`rad-${i}`} points={[[x1, 0, z1], [x2, 0, z2]] as [number, number, number][]} color="#00ff48" lineWidth={0.5} opacity={0.2} transparent />;
      })}
      
      {/* 円弧の描画 */}
      {MVA_MANUAL_ARCS.map((a, i) => {
        const pts: [number, number, number][] = [];
        const segments = 64;
        const startRad = (a.start - 90) * Math.PI / 180;
        let endRad = (a.end - 90) * Math.PI / 180;
        
        if (!a.isFull && endRad <= startRad) endRad += Math.PI * 2;
        if (a.isFull) endRad = startRad + Math.PI * 2;

        for (let j = 0; j <= segments; j++) {
          const angle = startRad + (endRad - startRad) * (j / segments);
          pts.push([
            a.r * Math.cos(angle) * SCALE_3D * LON_CORRECTION,
            0,
            a.r * Math.sin(angle) * SCALE_3D
          ] as [number, number, number]);
        }
        return <Line key={`arc-${i}`} points={pts} color="#00ff2f" lineWidth={0.5} opacity={0.2} transparent />;
      })}
    </group>
  );
};

interface MapPointProps {
  lat: number;
  lon: number;
  alt?: number;
  color: string;
  label: string;
  altScale: number;
}

const MapPoint: React.FC<MapPointProps> = ({ lat, lon, alt = 0, color, label, altScale }): JSX.Element => {
  const pos = [
    (lon - ARP.lon) * 60 * LON_CORRECTION * SCALE_3D,
    alt * altScale,
    -(lat - ARP.lat) * 60 * SCALE_3D
  ];

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[alt > 0 ? 0.2 : 0.4, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Text position={[0.5, 0.5, 0]} fontSize={0.5} color={color} anchorX="left">
        {label}
      </Text>
      {alt > 0 && (
        <Line points={[[0, 0, 0], [0, -alt * altScale, 0]] as [number, number, number][]} color="#044eb7" lineWidth={0.5} dashed />
      )}
    </group>
  );
};

/**
 * プロシージャーを1NM刻みのポイントに分割し、高度制限とマーカーを計算する
 */
const useProcedureNMPoints = (proc: any, getPos3D: (tgt: any) => any) => {
  return useMemo(() => {
    const points: {x: number, z: number, nm: number}[] = [];
    const markers: {x: number, z: number, nm: number, label: string}[] = [];
    let totalDist = 0;
    let lastNMDist = 0;

    proc.routes.forEach((r) => {
      const s = getPos3D(r.from);
      const e = getPos3D(r.to);
      
      if (r.type === 'arc' && r.center) {
        const c = getPos3D(r.center);
        const dxS = s.x_3d - c.x_3d;
        const dzS = s.z_3d - c.z_3d;
        const dxE = e.x_3d - c.x_3d;
        const dzE = e.z_3d - c.z_3d;
        const aStart = Math.atan2(dzS, dxS / LON_CORRECTION);
        let aEnd = Math.atan2(dzE, dxE / LON_CORRECTION);
        
        // 始点と終点の中心からの実距離を計算（データ上の半径との誤差を吸収するため）
        const distS = Math.sqrt((dxS / LON_CORRECTION) ** 2 + dzS ** 2);
        const distE = Math.sqrt((dxE / LON_CORRECTION) ** 2 + dzE ** 2);

        const isMapCW = r.sweep === 1;
        let diff = aEnd - aStart;

        // 角度差を [-PI, PI] の範囲に正規化
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff <= -Math.PI) diff += Math.PI * 2;

        // 指定された旋回方向（Map CW = 角度増加）に強制する
        if (isMapCW && diff < 0) diff += Math.PI * 2;
        if (!isMapCW && diff > 0) diff -= Math.PI * 2;

        aEnd = aStart + diff;

        // 平均半径でNM距離を算出
        const avgRadius = (distS + distE) / 2 / SCALE_3D;
        const arcNM = Math.abs(diff) * avgRadius;
        const steps = Math.max(1, Math.ceil(arcNM * 10)); // 0.1NM単位でサンプリング
        
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const angle = aStart + (aEnd - aStart) * ratio;
          const currentDist = (distS + (distE - distS) * ratio); // 半径を始点から終点へ補間
          const distOnSeg = ratio * arcNM;
          const currentTotal = totalDist + distOnSeg;

          const pos = {
            x: c.x_3d + Math.cos(angle) * currentDist * LON_CORRECTION,
            z: c.z_3d + Math.sin(angle) * currentDist,
            nm: currentTotal
          };
          points.push(pos);

          if (currentTotal >= lastNMDist + 1) {
            const nm = Math.floor(currentTotal);
            markers.push({ ...pos, label: nm.toString() });
            lastNMDist = nm;
          }
        }
        totalDist += arcNM;
      } else {
        const dx = e.x_3d - s.x_3d;
        const dz = e.z_3d - s.z_3d;
        const segDist = Math.sqrt((dx / LON_CORRECTION) ** 2 + dz ** 2) / SCALE_3D;
        const steps = Math.max(1, Math.ceil(segDist * 10));

        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const currentTotal = totalDist + ratio * segDist;
          const pos = {
            x: s.x_3d + dx * ratio,
            z: s.z_3d + dz * ratio,
            nm: currentTotal
          };
          points.push(pos);

          if (currentTotal >= lastNMDist + 1) {
            const nm = Math.floor(currentTotal);
            markers.push({ ...pos, label: nm.toString() });
            lastNMDist = nm;
          }
        }
        totalDist += segDist;
      }
    });

    return { points, markers };
  }, [proc, getPos3D]);
};

interface Procedure3DProps {
  id: string;
  proc: any;
  getPos: (tgt: any) => { x_3d: number; y_3d: number; z_3d: number };
  altScale: number;
}

const Procedure3D: React.FC<Procedure3DProps> = ({ id, proc, getPos, altScale }) => {
  const COLORS = {
    RJOH_SID: '#22d3ee',
    RJOH_ARR: '#f472b6',
    RJOC_SID: '#34d399',
    RJOC_ARR: '#c084fc',
  };

  const color = proc.air === 'RJOC' 
    ? (proc.type === 'SID' ? COLORS.RJOC_SID : COLORS.RJOC_ARR) 
    : (proc.type === 'SID' ? COLORS.RJOH_SID : COLORS.RJOH_ARR);

  const { points, markers } = useProcedureNMPoints(proc, getPos);

  // 設定された高度ポイント間を線形補間する関数
  const getInterpolatedAlt = useMemo(() => (nm: number) => {
    if (!proc.nmAltitudes) return 0;
    const keys = Object.keys(proc.nmAltitudes).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return 0;

    // 範囲外（最初の設定点より前、または最後の設定点より後）の処理
    if (nm <= keys[0]) return (proc.nmAltitudes[keys[0]] as any).alt;
    if (nm >= keys[keys.length - 1]) return (proc.nmAltitudes[keys[keys.length - 1]] as any).alt;

    // 隣り合う設定ポイントを探す
    let lower = keys[0];
    let upper = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (nm >= keys[i] && nm <= keys[i + 1]) {
        lower = keys[i];
        upper = keys[i + 1];
        break;
      }
    }

    // 線形補間計算
    const ratio = (nm - lower) / (upper - lower);
    const altLow = (proc.nmAltitudes[lower] as any).alt;
    const altHigh = (proc.nmAltitudes[upper] as any).alt;
    return altLow + (altHigh - altLow) * ratio;
  }, [proc.nmAltitudes]);

  // 制限高度は補間せず、指定されたNM地点にのみ存在する（記号付き文字列に対応）
  const getLimitData = (nm: number) => {
    const roundedNM = Math.round(nm);
    return (proc.nmAltitudes && proc.nmAltitudes[roundedNM])?.limit ?? null;
  };

  const linePoints = points.map(p => {
    return [p.x, getInterpolatedAlt(p.nm) * altScale, p.z] as [number, number, number];
  });

  return (
    <group>
      {/* メイン経路ライン */}
      <Line points={linePoints} color={color} lineWidth={2} transparent opacity={0.8} />

      {/* NMマーカーと高度制限 */}
      {markers.map((m, i) => {
        const nm = parseFloat(m.label);
        const y = getInterpolatedAlt(nm) * altScale;
        const limitVal = getLimitData(nm);

        return (
          <group key={`${id}-nm-${i}`} position={[m.x, y, m.z]}>
            {/* NM番号ラベル */}
            <Text position={[0, -0.5, 0]} fontSize={0.7} color="#ffffff" rotation={[-Math.PI/2, 0, 0]}>
              {`(${m.label})`}
            </Text>
            
            {/* 新しい高度制限マーカー (グラデーションブロック) */}
            <LimitMarker value={limitVal} y={y} altScale={altScale} />
          </group>
        );
      })}
    </group>
  );
};

/**
 * 高度制限マーカー Component
 * at or above (+): 平面から下へフェード
 * at or below (-): 平面から上へフェード
 * mandatory (+-): 平面のみ
 */
interface LimitMarkerProps {
  value: string | number | null;
  y: number;
  altScale: number;
}

const LimitMarker: React.FC<LimitMarkerProps> = ({ value, y, altScale }) => {
  const parsed = useMemo(() => {
    if (value === null || value === undefined) return null;
    const s = value.toString();
    const val = parseFloat(s);
    let type: 'above' | 'below' | 'both' = 'both';
    if (s.includes('+-')) type = 'both';
    else if (s.includes('+')) type = 'above';
    else if (s.includes('-')) type = 'below';
    return { val, type };
  }, [value]);

  if (!parsed) return null;

  // above(+) は青（安全な床）、below(-) は赤（警告の天井）
  const color = parsed.type === 'above' ? "#3b82f6" : parsed.type === 'below' ? "#ef4444" : "#ffffff";
  const limitY = parsed.val * altScale;
  const relativeY = limitY - y; // 親グループからの相対高さ

  return (
    <group position={[0, relativeY, 0]}>
      {/* 基準平面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* グラデーションブロック */}
      {parsed.type !== 'both' && (
        <mesh position={[0, parsed.type === 'above' ? -1 : 1, 0]}>
          <boxGeometry args={[1.4, 2, 1.4]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={{
              uColor: { value: new THREE.Color(color) },
              uIsAbove: { value: parsed.type === 'above' }
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 uColor;
              uniform bool uIsAbove;
              varying vec2 vUv;
              void main() {
                // Boxの側面UV(y)を利用してグラデーションを作成
                float alpha = uIsAbove ? vUv.y : (1.0 - vUv.y);
                gl_FragColor = vec4(uColor, alpha * 0.25);
              }
            `}
          />
        </mesh>
      )}

      <Text 
        position={[0, parsed.type === 'below' ? 0.3 : -0.3, 0.8]} 
        fontSize={0.5} 
        color="#ffffff" 
        rotation={[-Math.PI/2, 0, 0]}
      >
        {`${parsed.val}${parsed.type === 'above' ? '+' : parsed.type === 'below' ? '-' : ''}`}
      </Text>
    </group>
  );
};

interface Route3DProps {
  route: any;
  getPos: (tgt: any) => { x_3d: number; y_3d: number; z_3d: number };
  altScale: number;
}

const Route3D: React.FC<Route3DProps> = ({ route, getPos }) => {
  return (
    <group>
      {route.waypoints.slice(0, -1).map((wp: any, i: number) => {
        const start = getPos(wp);
        const end = getPos(route.waypoints[i + 1]);
        
        // セグメントの開始地点の高度(start.y_3d)を維持した水平な線
        const horizontalPoints = [
          [start.x_3d, start.y_3d, start.z_3d],
          [end.x_3d, start.y_3d, end.z_3d]
        ] as [number, number, number][];

        // 次のウェイポイントへの垂直なステップ線
        // 地面(0)から、その遷移地点における最高高度までを描画
        const maxHeight = Math.max(start.y_3d, end.y_3d);
        const verticalPoints = [
          [end.x_3d, 0, end.z_3d],
          [end.x_3d, maxHeight, end.z_3d]
        ] as [number, number, number][];
        
        return (
          <group key={`${route.id}-${i}`}>
            <Line points={horizontalPoints} color={route.color || '#94a3b8'} lineWidth={1.5} />
            {Math.abs(start.y_3d - end.y_3d) > 0.01 && (
              <Line points={verticalPoints} color={route.color || '#94a3b8'} lineWidth={1} dashed dashSize={0.4} gapSize={0.2} />
            )}
          </group>
        );
      })}
    </group>
  );
};

interface RadarDisplay3DProps {
  layers: any;
  activeProcedures: any;
  verticalScale: number;
}

const RadarDisplay3D: React.FC<RadarDisplay3DProps> = ({ layers, activeProcedures, verticalScale }) => {
  const altScale = ALT_BASE_FACTOR * verticalScale;

  // MVAの境界線とラベルデータから、動的にセクタのジオメトリ範囲を計算
  const allMvaSectors = useMemo((): any[] => {
    if (!layers.mva) return [];

    // 1. 重複を避けるため、正規化された高度のリストを作成
    const complexAltValues = MVA_COMPLEX_SECTORS.map(s => getNormalizedAlt(s.alt));
    
    // 正規化された数値でフィルタリングすることで、"25" と "2500" の混在などによる重複を防ぐ
    const filteredLabels = MVA_LABELS.filter(l => !complexAltValues.includes(getNormalizedAlt(l.alt)));
    
    const standard = computeMVASectors(MVA_RINGS, MVA_MANUAL_RADIALS, MVA_MANUAL_ARCS, filteredLabels);

    const convertedStandard: any[] = standard.map((s, idx) => ({
      id: `STD-${s.alt}-${idx}`,
      alt: s.alt,
      centerId: 'ARP',
      label: s.label, // 元のラベル位置を継承
      path: s.isFull 
        ? [
            { type: 'arc', r: s.r2, start: 0, end: 180 },
            { type: 'arc', r: s.r2, start: 180, end: 360 }
          ]
        : [
            { type: 'arc', r: s.r2, start: s.start, end: s.end },
            s.r1 > 0 
              ? { type: 'arc', r: s.r1, start: s.end, end: s.start }
              : { type: 'line', r: 0, deg: s.end }
          ]
    }));

    // 2. カスタムセクタ（複雑な形状）と統合
    return [...convertedStandard, ...MVA_COMPLEX_SECTORS];
  }, [layers.mva]); // computeMVASectors is stable, but adding it won't hurt

  const getPos3D = useCallback((tgt: any) => {
    const id = typeof tgt === 'string' ? tgt : (tgt && tgt.id);
    const allPoints = [...FIXES, ...VOR_DME, ...AIRPORTS];
    const f = allPoints.find(n => n.id === id);
    const lat = (f && f.lat) || (tgt && tgt.lat) || ARP.lat;
    const lon = (f && f.lon) || (tgt && tgt.lon) || ARP.lon;
    const alt = (tgt && tgt.alt) || 0;

    return {
      x_3d: (lon - ARP.lon) * 60 * LON_CORRECTION * SCALE_3D,
      y_3d: alt * altScale,
      z_3d: -(lat - ARP.lat) * 60 * SCALE_3D
    };
  }, [altScale]);

  // ルート上のユニークなFIX/Waypointを抽出してラベルを描画する
  const routeWaypoints = useMemo((): any[] => {
    const seen = new Set();
    const waypoints: any[] = [];
    const activeRoutes: any[] = [
      ...(layers.airways ? AIRWAYS : []),
      ...(layers.rnav ? RNAV_ROUTES : []),
      ...(layers.direct ? DIRECT_ROUTES : [])
    ];
    activeRoutes.forEach((route: any) => {
      route.waypoints.forEach(wp => {
        const id = typeof wp === 'string' ? wp : wp.id;
        if (!seen.has(id)) { seen.add(id); waypoints.push(wp); }
      });
    });
    return waypoints;
  }, [layers.airways, layers.rnav, layers.direct]);

  return (
    <div className="w-full h-full bg-slate-950">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 40, 60]} fov={50} />
        <OrbitControls makeDefault />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <CoordinateGrid />

        {/* Terrain */}
        {layers.terrain && <TerrainComponent isVisible={layers.terrain} verticalScale={verticalScale} />}

        {/* MVA Grid, Sectors & Labels */}
        {layers.mva && (
          <group>
            <MVAGrid3D />
            {/* 統一された MVAComplexSectorMesh を唯一のレンダラーとして使用 */}
            {layers.mva3d && allMvaSectors.map((s) => (
              <MVAComplexSectorMesh key={s.id} id={s.id} alt={s.alt} centerId={s.centerId} path={s.path} label={s.label} altScale={altScale} getPos3D={getPos3D} />
            ))}
          </group>
        )}

        {/* Airports */}
        {AIRPORTS.map(apt => (
          <MapPoint key={apt.id} lat={apt.lat} lon={apt.lon} color="#fbbf24" label={apt.id} altScale={altScale} />
        ))}

        {/* VORs */}
        {layers.vor && VOR_DME.map(vor => (
          <MapPoint key={vor.id} lat={vor.lat} lon={vor.lon} color="#38bdf8" label={vor.id} altScale={altScale} />
        ))}

        {/* Fixes */}
        {layers.fixes && FIXES
          .map(fix => (
            <MapPoint key={fix.id} lat={fix.lat} lon={fix.lon} color="#64748b" label={fix.id} altScale={altScale} />
          ))}

        {/* Routes */}
        {layers.airways && AIRWAYS.map((r, idx) => 
          <Route3D key={r.id} route={r} getPos={getPos3D} altScale={altScale} />)}
        {layers.rnav && RNAV_ROUTES.map((r, idx) => 
          <Route3D key={r.id} route={r} getPos={getPos3D} altScale={altScale} />)}
        {layers.direct && DIRECT_ROUTES.map((r, idx) => 
          <Route3D key={r.id} route={r} getPos={getPos3D} altScale={altScale} />)}

        {/* Procedures Rendering */}
        {Object.keys(activeProcedures).map(pid => {
          if (!activeProcedures[pid] || !PROCEDURES[pid]) return null;
          return <Procedure3D key={pid} id={pid} proc={PROCEDURES[pid]} getPos={getPos3D} altScale={altScale} />;
        })}

        {/* Unique Airborne Labels */}
        {routeWaypoints.map((wp, i) => {
          const p = getPos3D(wp);
          const id = typeof wp === 'string' ? wp : wp.id;
          if (!wp.alt) return null;
          return (
            <Text 
              key={`route-label-${id}`}
              position={[p.x_3d, p.y_3d + 0.5, p.z_3d]} 
              fontSize={0.45} 
              color="#ffffff"
            >
              {`${id}\n${wp.alt}`}
            </Text>
          );
        })}

        {/* Info Label */}
        <Text position={[-45, 0, 45]} fontSize={1} color="#475569" rotation={[-Math.PI/2, 0, 0]}>
          3D SECTOR VIEW v92.8
        </Text>
      </Canvas>
    </div>
  );
};

export default RadarDisplay3D;