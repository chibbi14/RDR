import React, { useState } from 'react';
import { latLonToCanvas, NM_TO_PX } from './geoUtils';
import { 
  AIRPORTS, VOR_DME, FIXES, MVA_RINGS, 
  ACA_POINTS_NM, MVA_MANUAL_ARCS, MVA_MANUAL_RADIALS, MVA_LABELS,
  PROCEDURES, RUNWAYS, AIRWAYS, DIRECT_ROUTES, RNAV_ROUTES
} from './navigationData';
import RadarDisplay3D from './RadarDisplay3D.jsx';
import { MapPin, Radio, Triangle, Eye, EyeOff, Box, Move3d, Layers } from 'lucide-react';

const RadarDisplay = () => {
  const [zoom, setZoom] = useState(1.0);
  const [is3D, setIs3D] = useState(false);
  const [verticalScale, setVerticalScale] = useState(1.0);
  const [layers, setLayers] = useState({ 
    aca: true, 
    mva: true, 
    fixes: true, 
    vor: true, 
    runways: true,
    airways: true,
    direct: true,
    rnav: true,
    mva3d: false
  });
  const [activeProcedures, setActiveProcedures] = useState({
    'INABA_25': true,
    'DOZEN_25_OC': true
  });
  const center = { x: 400, y: 400 };

  const COLORS = {
    RJOH_SID: '#22d3ee',
    RJOH_ARR: '#f472b6',
    RJOC_SID: '#34d399',
    RJOC_ARR: '#c084fc',
    ACA: 'rgba(255, 255, 0, 0.45)',
    MVA: 'rgba(0, 255, 255, 0.3)'
  };

  const nmToPx = (nm) => nm * NM_TO_PX * zoom;

  const getPos = (tgt) => {
    if (tgt && tgt.lat !== undefined) return latLonToCanvas(tgt.lat, tgt.lon, zoom, center);
    const id = typeof tgt === 'string' ? tgt : (tgt && tgt.id);
    const allPoints = [...FIXES, ...VOR_DME, ...AIRPORTS];
    const f = allPoints.find(n => n.id === id || n.name === id);
    return f ? latLonToCanvas(f.lat, f.lon, zoom, center) : { x: center.x, y: center.y };
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden flex flex-col">
      {/* UI Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-800 p-2 rounded border border-slate-600 text-white text-sm">
          Zoom: {zoom.toFixed(1)}
          <input 
            type="range" min="0.1" max="5" step="0.1" value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="block w-32 mt-1"
          />
          <button 
            onClick={() => setIs3D(!is3D)}
            className={`mt-2 w-full flex items-center justify-center gap-2 py-1 rounded border text-[10px] font-bold transition-all ${
              is3D ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-700 border-slate-500 text-slate-300'
            }`}
          >
            {is3D ? <Move3d size={12} /> : <Box size={12} />}
            {is3D ? '3D VIEW: ON' : '2D VIEW'}
          </button>
          {is3D && (
            <div className="mt-4 p-2 bg-slate-700/50 rounded border border-slate-600">
              <span className="text-[10px] text-slate-300 block mb-1">Vertical Exaggeration: {verticalScale.toFixed(1)}x</span>
              <input 
                type="range" min="0.1" max="5" step="0.1" value={verticalScale} 
                onChange={(e) => setVerticalScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>
        <div className="bg-slate-800 p-2 rounded border border-slate-600 text-white text-[10px] flex flex-col gap-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" checked={layers.aca} 
              onChange={() => setLayers(prev => ({ ...prev, aca: !prev.aca }))} 
            />
            ACA Boundary
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" checked={layers.mva} 
              onChange={() => setLayers(prev => ({ ...prev, mva: !prev.mva }))} 
            />
            MVA Sectors
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" checked={layers.vor} 
              onChange={() => setLayers(prev => ({ ...prev, vor: !prev.vor }))} 
            />
            VOR / DME
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-400">
            <input 
              type="checkbox" checked={layers.fixes} 
              onChange={() => setLayers(prev => ({ ...prev, fixes: !prev.fixes }))} 
            />
            Waypoints (FIX)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" checked={layers.runways} 
              onChange={() => setLayers(prev => ({ ...prev, runways: !prev.runways }))} 
            />
            Runways
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-500 font-bold">
            <input 
              type="checkbox" checked={layers.airways} 
              onChange={() => setLayers(prev => ({ ...prev, airways: !prev.airways }))} 
            />
            Airways
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-indigo-400 font-bold">
            <input 
              type="checkbox" checked={layers.rnav} 
              onChange={() => setLayers(prev => ({ ...prev, rnav: !prev.rnav }))} 
            />
            RNAV Routes
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-cyan-200">
            <input 
              type="checkbox" checked={layers.mva3d} 
              onChange={() => setLayers(prev => ({ ...prev, mva3d: !prev.mva3d }))} 
            />
            MVA 3D Planes
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-emerald-500 font-bold">
            <input 
              type="checkbox" checked={layers.direct} 
              onChange={() => setLayers(prev => ({ ...prev, direct: !prev.direct }))} 
            />
            Direct Routes
          </label>
        </div>
        <div className="bg-slate-800 p-2 rounded border border-slate-600 text-white text-[10px] flex flex-col gap-1">
          <p className="font-bold border-b border-slate-600 mb-1">Procedures</p>
          {Object.keys(PROCEDURES).map(pid => (
            <label key={pid} className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!!activeProcedures[pid]} 
                onChange={() => setActiveProcedures(prev => ({ ...prev, [pid]: !prev[pid] }))} 
              />
              <span className={PROCEDURES[pid].air === 'RJOC' ? 'text-emerald-400' : 'text-cyan-400'}>{pid}</span>
            </label>
          ))}
        </div>
      </div>

      {is3D ? (
        <div className="flex-1 w-full min-h-0">
          <RadarDisplay3D layers={layers} activeProcedures={activeProcedures} verticalScale={verticalScale} />
        </div>
      ) : (
        <svg viewBox="0 0 800 800" className="w-full h-full cursor-crosshair bg-slate-900">
        {/* MVA Circles (Background Layer) */}
        {MVA_RINGS.map(dist => (
          <circle
            key={dist}
            cx={center.x} cy={center.y}
            r={dist * NM_TO_PX * zoom}
            fill="none" stroke="#1e293b" strokeWidth="1"
          />
        ))}

        {/* Crosshair */}
        <line x1={center.x - 10} y1={center.y} x2={center.x + 10} y2={center.y} stroke="#334155" />
        <line x1={center.x} y1={center.y - 10} x2={center.x} y2={center.y + 10} stroke="#334155" />

        <g transform={`translate(${center.x}, ${center.y})`}>
          {/* ACA (Airspace Control Area) */}
          {layers.aca && (
            <g stroke={COLORS.ACA} strokeWidth="1.2" fill="none">
              <path d={`M ${nmToPx(ACA_POINTS_NM[7].x)} ${nmToPx(-ACA_POINTS_NM[7].y)} A ${nmToPx(34)} ${nmToPx(34)} 0 0 1 ${nmToPx(ACA_POINTS_NM[12].x)} ${nmToPx(-ACA_POINTS_NM[12].y)}`} />
              <path d={`M ${nmToPx(ACA_POINTS_NM[9].x)} ${nmToPx(-ACA_POINTS_NM[9].y)} A ${nmToPx(25)} ${nmToPx(25)} 0 0 1 ${nmToPx(ACA_POINTS_NM[2].x)} ${nmToPx(-ACA_POINTS_NM[2].y)}`} />
              <path d={`M ${nmToPx(ACA_POINTS_NM[10].x)} ${nmToPx(-ACA_POINTS_NM[10].y)} A ${nmToPx(34)} ${nmToPx(34)} 0 0 1 ${nmToPx(ACA_POINTS_NM[11].x)} ${nmToPx(-ACA_POINTS_NM[11].y)}`} />
              <path d={`M ${nmToPx(ACA_POINTS_NM[12].x)} ${nmToPx(-ACA_POINTS_NM[12].y)} A ${nmToPx(15)} ${nmToPx(15)} 0 0 0 ${nmToPx(ACA_POINTS_NM[10].x)} ${nmToPx(-ACA_POINTS_NM[10].y)}`} />
              <line x1={nmToPx(ACA_POINTS_NM[7].x)} y1={nmToPx(-ACA_POINTS_NM[7].y)} x2={nmToPx(ACA_POINTS_NM[4].x)} y2={nmToPx(-ACA_POINTS_NM[4].y)} />
              <line x1={nmToPx(ACA_POINTS_NM[4].x)} y1={nmToPx(-ACA_POINTS_NM[4].y)} x2={nmToPx(ACA_POINTS_NM[3].x)} y2={nmToPx(-ACA_POINTS_NM[3].y)} />
              <line x1={nmToPx(ACA_POINTS_NM[3].x)} y1={nmToPx(-ACA_POINTS_NM[3].y)} x2={nmToPx(ACA_POINTS_NM[1].x)} y2={nmToPx(-ACA_POINTS_NM[1].y)} />
              <line x1={nmToPx(ACA_POINTS_NM[8].x)} y1={nmToPx(-ACA_POINTS_NM[8].y)} x2={nmToPx(ACA_POINTS_NM[5].x)} y2={nmToPx(-ACA_POINTS_NM[5].y)} />
              <line x1={nmToPx(ACA_POINTS_NM[8].x)} y1={nmToPx(-ACA_POINTS_NM[8].y)} x2={nmToPx(ACA_POINTS_NM[6].x)} y2={nmToPx(-ACA_POINTS_NM[6].y)} />
              <line x1={nmToPx(ACA_POINTS_NM[9].x)} y1={nmToPx(-ACA_POINTS_NM[9].y)} x2={nmToPx(ACA_POINTS_NM[11].x)} y2={nmToPx(-ACA_POINTS_NM[11].y)} />
            </g>
          )}

          {/* MVA Sectors */}
          {layers.mva && (
            <g stroke={COLORS.MVA} strokeWidth="0.8" fill="none" strokeDasharray="3,2">
              {MVA_MANUAL_ARCS.map((a, i) => a.isFull ? 
                <circle key={i} r={nmToPx(a.r)} opacity="0.1" /> : 
                <path key={i} d={`M ${nmToPx(a.r * Math.cos((a.start - 90) * Math.PI / 180))} ${nmToPx(a.r * Math.sin((a.start - 90) * Math.PI / 180))} A ${nmToPx(a.r)} ${nmToPx(a.r)} 0 ${((a.end - a.start + 360) % 360) > 180 ? 1 : 0} 1 ${nmToPx(a.r * Math.cos((a.end - 90) * Math.PI / 180))} ${nmToPx(a.r * Math.sin((a.end - 90) * Math.PI / 180))}`} />
              )}
              {MVA_MANUAL_RADIALS.map((r, i) => (
                <line key={`rad-${i}`} x1={nmToPx(r.r1 * Math.cos((r.deg - 90) * Math.PI / 180))} y1={nmToPx(r.r1 * Math.sin((r.deg - 90) * Math.PI / 180))} x2={nmToPx(r.r2 * Math.cos((r.deg - 90) * Math.PI / 180))} y2={nmToPx(r.r2 * Math.sin((r.deg - 90) * Math.PI / 180))} />
              ))}
              {MVA_LABELS.map((l, i) => (
                <text 
                  key={i} 
                  x={nmToPx(l.label.r * Math.cos((l.label.deg - 90) * Math.PI / 180))} 
                  y={nmToPx(l.label.r * Math.sin((l.label.deg - 90) * Math.PI / 180))} 
                  fill="cyan" 
                  fontSize="8" 
                  textAnchor="middle" 
                  opacity="0.4"
                  className="select-none"
                >
                  {l.alt}
                </text>
              ))}
            </g>
          )}
        </g>

        {/* Airways Layer */}
        {layers.airways && AIRWAYS.map(route => (
          <g key={route.id} opacity="0.4">
            {route.waypoints.slice(0, -1).map((wp, i) => {
              const nextWp = route.waypoints[i + 1];
              const start = getPos(wp);
              const end = getPos(nextWp);
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`${route.id}-${i}`}>
                  <line 
                    x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                    stroke={route.color} strokeWidth="1" strokeDasharray="10,5"
                  />
                  {wp.alt && (
                    <text x={midX} y={midY - 5} fill={route.color} fontSize="8" textAnchor="middle" className="select-none">
                      {wp.alt}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* RNAV Routes Layer */}
        {layers.rnav && RNAV_ROUTES.map(route => (
          <g key={route.id} opacity="0.6">
            {route.waypoints.slice(0, -1).map((wp, i) => {
              const nextWp = route.waypoints[i + 1];
              const start = getPos(wp);
              const end = getPos(nextWp);
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`${route.id}-${i}`}>
                  <line 
                    x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                    stroke={route.color} strokeWidth="1.2" strokeDasharray="5,2"
                  />
                  {wp.alt && (
                    <text x={midX} y={midY - 5} fill={route.color} fontSize="8" textAnchor="middle" className="select-none">
                      {wp.alt}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Direct Routes Layer */}
        {layers.direct && DIRECT_ROUTES.map(route => (
          <g key={route.id} opacity="0.6">
            {route.waypoints.slice(0, -1).map((wp, i) => {
              const nextWp = route.waypoints[i + 1];
              const start = getPos(wp);
              const end = getPos(nextWp);
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`${route.id}-${i}`}>
                  <line 
                    x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                    stroke={route.color || '#10b981'} strokeWidth="1" strokeDasharray="2,4"
                  />
                  {wp.alt && (
                    <text x={midX} y={midY - 5} fill={route.color || '#10b981'} fontSize="8" textAnchor="middle" className="select-none">
                      {wp.alt}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Procedures Layer */}
        {Object.keys(activeProcedures).map(pid => {
          if (!activeProcedures[pid] || !PROCEDURES[pid]) return null;
          const proc = PROCEDURES[pid];
          const color = proc.air === 'RJOC' ? (proc.type === 'SID' ? COLORS.RJOC_SID : COLORS.RJOC_ARR) : (proc.type === 'SID' ? COLORS.RJOH_SID : COLORS.RJOH_ARR);
          
          return proc.routes.map((r, idx) => {
            const s = getPos(r.from);
            const e = getPos(r.to);
            if (r.type === 'arc') {
              const rad = nmToPx(r.radius);
              const c = getPos(r.center);
              return <path key={`${pid}-${idx}`} d={`M ${s.x} ${s.y} A ${rad} ${rad} 0 ${r.largeArc || 0} ${r.sweep} ${e.x} ${e.y}`} stroke={color} fill="none" strokeWidth="1.5" strokeDasharray={proc.dash} opacity="0.8" />;
            }
            return <line key={`${pid}-${idx}`} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={color} strokeWidth="1.5" strokeDasharray={proc.dash} opacity="0.8" />;
          });
        })}

        {/* Runways Layer */}
        {layers.runways && RUNWAYS.map(rwy => {
          const pos = latLonToCanvas(rwy.lat, rwy.lon, zoom, center);
          return <circle key={`${rwy.air}-${rwy.id}`} cx={pos.x} cy={pos.y} r="2" fill="white" />;
        })}

        {/* Fixes */}
        {layers.fixes && FIXES.map(fix => {
          const pos = latLonToCanvas(fix.lat, fix.lon, zoom, center);
          return (
            <g key={fix.id}>
              <path d={`M ${pos.x} ${pos.y-4} L ${pos.x+4} ${pos.y+4} L ${pos.x-4} ${pos.y+4} Z`} fill="#64748b" />
              <text x={pos.x + 6} y={pos.y + 4} fontSize="10" fill="#64748b" className="select-none">{fix.id}</text>
            </g>
          );
        })}

        {/* VOR/DME */}
        {layers.vor && VOR_DME.map(vor => {
          const pos = latLonToCanvas(vor.lat, vor.lon, zoom, center);
          return (
            <g key={vor.id}>
              <rect x={pos.x-4} y={pos.y-4} width={8} height={8} fill="none" stroke="#38bdf8" />
              <circle cx={pos.x} cy={pos.y} r={2} fill="#38bdf8" />
              <text x={pos.x + 6} y={pos.y - 4} fontSize="12" fontWeight="bold" fill="#38bdf8" className="select-none">{vor.id}</text>
            </g>
          );
        })}

        {/* Airports */}
        {AIRPORTS.map(apt => {
          const pos = latLonToCanvas(apt.lat, apt.lon, zoom, center);
          return (
            <g key={apt.id}>
              <circle cx={pos.x} cy={pos.y} r={4} fill="none" stroke="#fbbf24" strokeWidth="2" />
              <line x1={pos.x-6} y1={pos.y} x2={pos.x+6} y2={pos.y} stroke="#fbbf24" />
              <line x1={pos.x} y1={pos.y-6} x2={pos.x} y2={pos.y+6} stroke="#fbbf24" />
              <text x={pos.x + 8} y={pos.y + 12} fontSize="12" fontWeight="bold" fill="#fbbf24" className="select-none">{apt.id}</text>
            </g>
          );
        })}
      </svg>
      )}

      {/* Info Bar */}
      <div className="bg-slate-800 p-1 px-4 border-t border-slate-600 text-[10px] text-slate-400 flex justify-between">
        <span>REF: RJOH ARP (35.4933, 133.2391)</span>
        <span>V92.8 PROTOTYPE</span>
      </div>
    </div>
  );
};

export default RadarDisplay;