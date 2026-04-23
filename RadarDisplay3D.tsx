import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ARP, LON_CORRECTION, NM_TO_PX, computeMVASectors } from './geoUtils';
import { 
  AIRPORTS, VOR_DME, FIXES, AIRWAYS, RNAV_ROUTES, DIRECT_ROUTES, PROCEDURES,
  MVA_MANUAL_ARCS, MVA_MANUAL_RADIALS, MVA_RINGS, MVA_LABELS,
  MVA_COMPLEX_SECTORS
} from './navigationData';

const SCALE_3D = 1; // 1NM = 1 unit in 3D
const ALT_BASE_FACTOR = 0.0005; 

// MVAの高度表記（25 -> 2500）を変換するヘルパー
const getNormalizedAlt = (alt) => {
  const val = parseFloat(alt);
  return val < 1000 ? val * 100 : val;
};

const CoordinateGrid = () => (
  <gridHelper args={[200, 20, 0x334155, 0x1e293b]} rotation={[0, 0, 0]} />
);
// 基準点オフセットと任意経路（Arc/Line）に対応したMVAセクタ
const MVAComplexSectorMesh = ({ id, alt, centerId = 'ARP', path, altScale, getPos3D }) => {
  const normalizedAlt = getNormalizedAlt(alt);
  const yPos = normalizedAlt * altScale;
  const centerPos = getPos3D(centerId);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (path.length === 0) return s;

    // パスの開始点へ移動
    const first = path[0];
    const startAngle = ((first.type === 'arc' ? first.start : first.deg) - 90) * Math.PI / 180;
    s.moveTo(Math.cos(startAngle) * first.r, Math.sin(startAngle) * first.r);

    path.forEach((seg) => {
      if (seg.type === 'line') {
        const rad = (seg.deg - 90) * Math.PI / 180;
        s.lineTo(Math.cos(rad) * seg.r, Math.sin(rad) * seg.r);
      } else if (seg.type === 'arc') {
        const sRad = (seg.start - 90) * Math.PI / 180;
        const eRad = (seg.end - 90) * Math.PI / 180;
        const delta = (seg.end - seg.start + 360) % 360;
        // 航空のCW(0->90)は数学座標系ではCCW（反時計回り）
        const isAviationCW = delta < 180;
        s.absarc(0, 0, seg.r, sRad, eRad, !isAviationCW);
      }
    });
    s.closePath();
    return s;
  }, [path]);

  const borderPoints = useMemo(() => {
    const pts = [];
    if (path.length === 0) return pts;

    // 開始点を追加
    const first = path[0];
    const startAngle = ((first.type === 'arc' ? first.start : first.deg) - 90) * Math.PI / 180;
    pts.push([Math.cos(startAngle) * first.r * LON_CORRECTION, 0, Math.sin(startAngle) * first.r]);

    path.forEach(seg => {
      if (seg.type === 'line') {
        const rad = (seg.deg - 90) * Math.PI / 180;
        pts.push([Math.cos(rad) * seg.r * LON_CORRECTION, 0, Math.sin(rad) * seg.r]);
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
          pts.push([Math.cos(a) * seg.r * LON_CORRECTION, 0, Math.sin(a) * seg.r]);
        }
      }
    });
    pts.push(pts[0]);
    return pts;
  }, [path]);

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

  // 高度ラベルをセクタの概ね中央（頂点の平均）に配置
  const labelPos = useMemo(() => {
    if (borderPoints.length === 0) return [0, 0.5, 0];
    // 重心を計算 (最後の重複点を除く)
    const validPts = borderPoints.slice(0, -1);
    const sumX = validPts.reduce((sum, p) => sum + p[0], 0);
    const sumZ = validPts.reduce((sum, p) => sum + p[2], 0);
    return [sumX / validPts.length, 0.5, sumZ / validPts.length];
  }, [borderPoints]);

  const isCustom = id && !id.startsWith('STD-');

  return (
    <group position={[centerPos.x_3d, yPos, centerPos.z_3d]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[LON_CORRECTION, 1, 1]} renderOrder={2}>
        <shapeGeometry args={[shape, 32]} />
        <meshBasicMaterial 
          color="#ffcc00" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} 
        />
      </mesh>
      <Line points={borderPoints} color="#ff9d00" lineWidth={1} opacity={0.7} transparent />
      
      {/* 垂直な壁の追加 */}
      <mesh position={[0, -yPos, 0]} geometry={wallGeometry} renderOrder={2}>
        <meshBasicMaterial color="#ffb300" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <Text 
        position={labelPos} fontSize={1.2} color="#ffcc00" rotation={[-Math.PI/2, 0, 0]} 
        opacity={0.8} transparent textAlign="center"
      >
        {isCustom ? `${id}\n${alt}` : alt}
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
        return <Line key={`rad-${i}`} points={[[x1, 0, z1], [x2, 0, z2]]} color="#00ff48" lineWidth={0.5} opacity={0.2} transparent />;
      })}
      
      {/* 円弧の描画 */}
      {MVA_MANUAL_ARCS.map((a, i) => {
        const pts = [];
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
          ]);
        }
        return <Line key={`arc-${i}`} points={pts} color="#00ff2f" lineWidth={0.5} opacity={0.2} transparent />;
      })}
    </group>
  );
};

const MapPoint = ({ lat, lon, alt = 0, color, label, altScale }) => {
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
        <Line points={[[0, 0, 0], [0, -alt * altScale, 0]]} color="#044eb7" lineWidth={0.5} dashed />
      )}
    </group>
  );
};

const Route3D = ({ route, getPos, altScale }) => {
  return (
    <group>
      {route.waypoints.slice(0, -1).map((wp, i) => {
        const start = getPos(wp);
        const end = getPos(route.waypoints[i + 1]);
        
        // セグメントの開始地点の高度(start.y_3d)を維持した水平な線
        const horizontalPoints = [
          [start.x_3d, start.y_3d, start.z_3d],
          [end.x_3d, start.y_3d, end.z_3d]
        ];

        // 次のウェイポイントへの垂直なステップ線
        // 地面(0)から、その遷移地点における最高高度までを描画
        const maxHeight = Math.max(start.y_3d, end.y_3d);
        const verticalPoints = [
          [end.x_3d, 0, end.z_3d],
          [end.x_3d, maxHeight, end.z_3d]
        ];
        
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

const RadarDisplay3D = ({ layers, activeProcedures, verticalScale }) => {
  const altScale = ALT_BASE_FACTOR * verticalScale;

  // MVAの境界線とラベルデータから、動的にセクタのジオメトリ範囲を計算
  const allMvaSectors = useMemo(() => {
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
  }, [layers.mva]);

  const getPos3D = (tgt) => {
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
  };

  // ルート上のユニークなFIX/Waypointを抽出してラベルを描画する
  const routeWaypoints = useMemo(() => {
    const seen = new Set();
    const waypoints = [];
    const activeRoutes = [
      ...(layers.airways ? AIRWAYS : []),
      ...(layers.rnav ? RNAV_ROUTES : []),
      ...(layers.direct ? DIRECT_ROUTES : [])
    ];
    activeRoutes.forEach(route => {
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

        {/* 呼び出し確認用デバッグテキスト */}
        <Text position={[0, 10, 0]} fontSize={20} color="red">
          3D RENDERER ACTIVE
        </Text>
        
        <CoordinateGrid />

        {/* MVA Grid, Sectors & Labels */}
        {layers.mva && (
          <group>
            <MVAGrid3D />
            {/* 統一された MVAComplexSectorMesh を唯一のレンダラーとして使用 */}
            {layers.mva3d && allMvaSectors.map((s) => (
              <MVAComplexSectorMesh key={s.id} {...s} altScale={altScale} getPos3D={getPos3D} />
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
          .filter(fix => !fix.id.includes('IAP')) // IAP関連FIXをフィルタ
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