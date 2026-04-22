import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ARP, LON_CORRECTION, NM_TO_PX, computeMVASectors } from './geoUtils';
import { 
  AIRPORTS, VOR_DME, FIXES, AIRWAYS, RNAV_ROUTES, DIRECT_ROUTES, PROCEDURES,
  MVA_MANUAL_ARCS, MVA_MANUAL_RADIALS, MVA_RINGS, MVA_LABELS
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

// 扇形セクタを高度に合わせて立体的に描画するコンポーネント
const MVACurvedSectorMesh = ({ r1, r2, start, end, isFull, alt, altScale, elevated = false }) => {
  const normalizedAlt = getNormalizedAlt(alt);
  const yPos = elevated ? normalizedAlt * altScale : 0;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const startRad = (start - 90) * Math.PI / 180;
    let endRad = (end - 90) * Math.PI / 180;
    
    if (!isFull && endRad <= startRad) endRad += Math.PI * 2;
    if (isFull) endRad = startRad + Math.PI * 2;

    // 扇形の外周と内周を定義
    s.absarc(0, 0, r2 * SCALE_3D, startRad, endRad, false);
    if (r1 > 0) {
      s.absarc(0, 0, r1 * SCALE_3D, endRad, startRad, true);
    } else {
      s.lineTo(0, 0);
    }
    return s;
  }, [r1, r2, start, end, isFull]);

  // メッシュの中央に高度を表示するための座標計算
  const labelPos = useMemo(() => {
    const startRad = (start - 90) * Math.PI / 180;
    let endRad = (end - 90) * Math.PI / 180;
    if (!isFull && endRad <= startRad) endRad += Math.PI * 2;
    if (isFull) endRad = startRad + Math.PI * 2;
    
    const midAngle = (startRad + endRad) / 2;
    const midR = (r1 + r2) / 2;
    
    return [
      midR * Math.cos(midAngle) * SCALE_3D * LON_CORRECTION,
      0.15, // メッシュのすぐ上に配置
      midR * Math.sin(midAngle) * SCALE_3D
    ];
  }, [r1, r2, start, end, isFull]);

  return (
    <group position={[0, yPos, 0]}>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        scale={[LON_CORRECTION, 1, 1]}
        renderOrder={1}
      >
        <shapeGeometry args={[shape, 32]} />
        {/* セクタの塗りつぶし (シアン) */}
        <meshBasicMaterial color="#00ffff" transparent opacity={0.01} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* セクタの縁取り線 (2Dの表示機構を3D空中へ投影) */}
      <Line 
        points={useMemo(() => {
          const pts = [];
          const segs = 32;
          const sRad = (start - 90) * Math.PI / 180;
          let eRad = (end - 90) * Math.PI / 180;
          if (!isFull && eRad <= sRad) eRad += Math.PI * 2;
          if (isFull) eRad = sRad + Math.PI * 2;
          for (let i = 0; i <= segs; i++) {
            const a = sRad + (eRad - sRad) * (i / segs);
            pts.push([Math.cos(a) * r2 * SCALE_3D * LON_CORRECTION, 0, Math.sin(a) * r2 * SCALE_3D]);
          }
          if (r1 > 0) {
            for (let i = segs; i >= 0; i--) {
              const a = sRad + (eRad - sRad) * (i / segs);
              pts.push([Math.cos(a) * r1 * SCALE_3D * LON_CORRECTION, 0, Math.sin(a) * r1 * SCALE_3D]);
            }
          } else { pts.push([0, 0, 0]); }
          pts.push(pts[0]);
          return pts;
        }, [r1, r2, start, end, isFull])} 
        color="#00ffff" lineWidth={1} opacity={0.4} transparent 
      />

      <Text 
        position={labelPos} 
        fontSize={0.9} 
        color="#00f2ff" 
        opacity={elevated ? 1 : 0.3} 
        transparent rotation={[-Math.PI / 2, 0, 0]}
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
        return <Line key={`rad-${i}`} points={[[x1, 0, z1], [x2, 0, z2]]} color="#00aeff" lineWidth={0.5} opacity={0.2} transparent />;
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
        return <Line key={`arc-${i}`} points={pts} color="#00fff7" lineWidth={0.5} opacity={0.2} transparent />;
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
  const mvaSectors = useMemo(() => {
    if (!layers.mva) return [];
    return computeMVASectors(MVA_RINGS, MVA_MANUAL_RADIALS, MVA_MANUAL_ARCS, MVA_LABELS);
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
        
        <CoordinateGrid />

        {/* MVA Grid, Sectors & Labels */}
        {layers.mva && (
          <group>
            <MVAGrid3D />
            {/* 3D Elevated Planes: 動的に計算されたセクタデータを使用 */}
            {layers.mva3d && mvaSectors.map((s, i) => <MVACurvedSectorMesh key={`mva-3d-${i}`} {...s} altScale={altScale} elevated={true} />)}
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