import React, { useState, useRef, useEffect } from 'react';
import { latLonToCanvas, NM_TO_PX, calcRelativeLatLon } from './geoUtils';
import { 
  AIRPORTS, VOR_DME, FIXES, MVA_RINGS, 
  ACA_POINTS_NM, MVA_MANUAL_ARCS, MVA_MANUAL_RADIALS, MVA_LABELS,
  PROCEDURES, RUNWAYS, AIRWAYS, DIRECT_ROUTES, RNAV_ROUTES
} from './navigationData';
import RadarDisplay3D from './RadarDisplay3D.tsx';
import { MapPin, Radio, Triangle, Eye, EyeOff, Box, Move3d, Layers, Menu, X, ChevronDown, ChevronRight, Settings, ShieldAlert, Navigation } from 'lucide-react';

type NavMode = 'PROC' | 'VECTOR' | 'DIRECT';

interface AircraftState {
  id: string;
  callsign: string;
  mode: NavMode;
  pos: { lat: number; lon: number; alt: number };
  vector: { hdg: number; gs: number };
  isStarAuthorized: boolean;
  isApproachCleared: boolean;
  flightPlan: string[];
  targetFix: string | null;
  inductionTarget: string | null;
  targetAlt: number;
  targetHdg: number;
  tagOffset: { x: number; y: number };
  // 管制ストリップ用追加データ
  aircraftType: string;
  squawk: string;
  departureDestination: string;
  commStart: string;
  commEnd: string;
  identTime: string;
}

// 航法計算用ユーティリティ
const calculateBearing = (start: { lat: number; lon: number }, end: { lat: number; lon: number }) => {
  const y = Math.sin((end.lon - start.lon) * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180);
  const x = Math.cos(start.lat * Math.PI / 180) * Math.sin(end.lat * Math.PI / 180) -
            Math.sin(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) * Math.cos((end.lon - start.lon) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const calculateDistance = (p1: { lat: number; lon: number }, p2: { lat: number; lon: number }) => {
  const dLat = (p2.lat - p1.lat) * 60;
  const dLon = (p2.lon - p1.lon) * 60 * Math.cos(p1.lat * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

const RadarDisplay = () => {
  const [zoom, setZoom] = useState(1.0);
  const [is3D, setIs3D] = useState(false);
  const [verticalScale, setVerticalScale] = useState(1.0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    settings: false,
    nav: false,
    safety: false,
    rjohProc: false,
    rjocProc: false,
  });
  const touchStartX = useRef<number | null>(null);

  const [layers, setLayers] = useState({ 
    aca: true, 
    mva: true, 
    fixes: false, 
    vor: true, 
    runways: false,
    airways: false,
    direct: false,
    rnav: false,
    mva3d: false,
    terrain: false,
    airwayProtection: false
  });

  const [aircrafts, setAircrafts] = useState<AircraftState[]>([
    {
      id: 'ac1',
      callsign: 'JAL123',
      mode: 'PROC',
      // RAKDA (35.5195, 133.6401) の 5NM 東
      pos: { lat: 35.5195, lon: 133.742, alt: 3500 },
      vector: { hdg: 250, gs: 210 },
      isStarAuthorized: false,
      isApproachCleared: false,
      flightPlan: ['RAKDA', 'GAINA', 'YUMII', 'RJOH'],
      targetFix: 'RAKDA',
      inductionTarget: 'RAKDA',
      targetAlt: 10000,
      targetHdg: 250,
      tagOffset: { x: 30, y: -30 },
      aircraftType: 'B772',
      squawk: '1200',
      departureDestination: 'RJTT/RJOH',
      commStart: '0820',
      commEnd: '0930',
      identTime: '0825'
    },
    {
      id: 'ac2',
      callsign: 'ANA456',
      mode: 'PROC',
      // RAKDA (35.5195, 133.6401) の 5NM 東
      pos: { lat: 35.5195, lon: 133.742, alt: 8000 },
      vector: { hdg: 70, gs: 180 },
      isStarAuthorized: false,
      isApproachCleared: false,
      flightPlan: ['RAKDA', 'NAKAU', 'RJOC'],
      targetFix: 'RAKDA',
      inductionTarget: 'RAKDA',
      targetAlt: 4000,
      targetHdg: 70,
      tagOffset: { x: 30, y: 30 },
      aircraftType: 'A321',
      squawk: '5678',
      departureDestination: 'RJBB/RJOH',
      commStart: '0845',
      commEnd: '1000',
      identTime: '0850'
    }
  ]);

  const [activeProcedures, setActiveProcedures] = useState<Record<string, boolean>>({});
  const center = { x: 400, y: 400 };

  // Physics loop (1 second update)
  useEffect(() => {
    const interval = setInterval(() => {
      setAircrafts(prev => prev.map(ac => {
        let newTargetHdg = ac.targetHdg;
        let newTargetFix = ac.targetFix;
        let newMode = ac.mode;

        // 1. Navigation Mode Logic (DIRECT / PROC)
        if ((ac.mode === 'DIRECT' || ac.mode === 'PROC') && ac.targetFix) {
          const fixPos = getLatLonById(ac.targetFix);
          if (fixPos) {
            // 目標地点への方位を計算
            newTargetHdg = calculateBearing(ac.pos, fixPos);
            
            // 到達判定 (0.5NM 以内)
            const dist = calculateDistance(ac.pos, fixPos);
            if (dist < 0.5) {
              if (ac.mode === 'PROC') {
                const currentIndex = ac.flightPlan.indexOf(ac.targetFix);
                if (currentIndex !== -1 && currentIndex < ac.flightPlan.length - 1) {
                  // 次の Fix へ
                  newTargetFix = ac.flightPlan[currentIndex + 1];
                } else {
                  // 経路終了 -> VECTORモードで現在方位維持
                  newMode = 'VECTOR';
                  newTargetFix = null;
                }
              } else {
                // DIRECT モード終了
                newMode = 'VECTOR';
                newTargetFix = null;
              }
            }
          }
        }

        // 2. Heading logic (3deg/s turn rate)
        let currentHdg = ac.vector.hdg;
        if (Math.abs(currentHdg - newTargetHdg) > 0.1) {
          let diff = (newTargetHdg - currentHdg + 360) % 360;
          if (diff > 180) diff -= 360;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), 3);
          currentHdg = (currentHdg + turn + 360) % 360;
        }
        // 3. Altitude logic (2000ft/min = 33ft/s)
        const climbRate = 2000 / 60;
        const nextAlt = Math.abs(ac.targetAlt - ac.pos.alt) > climbRate 
          ? ac.pos.alt + Math.sign(ac.targetAlt - ac.pos.alt) * climbRate 
          : ac.targetAlt;
        // 4. Forward Movement
        const dist = ac.vector.gs / 3600; // NM per sec
        const nextPos = calcRelativeLatLon(ac.pos.lat, ac.pos.lon, currentHdg, dist);
        return { 
          ...ac, 
          mode: newMode,
          targetFix: newTargetFix,
          targetHdg: newTargetHdg,
          pos: { ...nextPos, alt: nextAlt }, 
          vector: { ...ac.vector, hdg: currentHdg } 
        };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateAircraftTarget = (id: string, updates: Partial<AircraftState>) => {
    setAircrafts(prev => prev.map(ac => {
      if (ac.id === id) {
        // 方位を手動で変更（Vector開始）した場合は VECTOR モードへ移行
        let newMode = updates.targetHdg !== undefined ? 'VECTOR' : (updates.mode || ac.mode);
        return { ...ac, ...updates, mode: newMode };
      }
      return ac;
    }));
  };

  // Resume Own Navigation: VECTORモードを終了し、誘導目標へ向かう
  const handleResumeOwnNavigation = (ac: AircraftState) => {
    if (ac.mode !== 'VECTOR' || !ac.inductionTarget) return;
    
    const isInPlan = ac.flightPlan.includes(ac.inductionTarget);
    updateAircraftTarget(ac.id, {
      targetFix: ac.inductionTarget,
      mode: isInPlan ? 'PROC' : 'DIRECT'
    });
  };

  // Recleared Direct: 飛行計画内の特定のFIXへ直行し、以降の経路を維持
  const handleReclearedDirect = (ac: AircraftState, fixId: string) => {
    const currentIndex = ac.flightPlan.indexOf(fixId);
    let newPlan = [...ac.flightPlan];
    
    if (currentIndex !== -1) {
      // 指定されたFIXより前の経路をスキップ
      newPlan = ac.flightPlan.slice(currentIndex);
    } else {
      // 計画外のFIXの場合は、それを先頭に追加（DIRECTモード相当）
      newPlan = [fixId];
    }

    updateAircraftTarget(ac.id, {
      flightPlan: newPlan,
      targetFix: fixId,
      inductionTarget: fixId,
      mode: 'PROC'
    });
  };

  const getLatLonById = (id: string) => {
    const allPoints = [...FIXES, ...VOR_DME, ...AIRPORTS];
    const f = allPoints.find(n => n.id === id || n.name === id);
    return f ? { lat: f.lat, lon: f.lon } : null;
  };

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

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStartX.current - currentX;

    // Swipe left to close (from within menu)
    if (diff > 50 && isMenuOpen) {
      setIsMenuOpen(false);
      touchStartX.current = null;
    }
    // Swipe right to open (starting from left edge)
    if (diff < -50 && !isMenuOpen && touchStartX.current < 40) {
      setIsMenuOpen(true);
      touchStartX.current = null;
    }
  };


  return (
    <div 
      className="relative w-full h-screen bg-slate-900 overflow-hidden flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Mobile Menu Toggle Button */}
      {!isMenuOpen && (
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="absolute top-4 left-4 z-30 p-2 bg-slate-800 border border-slate-600 rounded-full text-white lg:hidden shadow-lg"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 flex flex-col transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <h2 className="text-cyan-400 font-bold flex items-center gap-2 text-sm">
            <Layers size={16} /> RADAR CONTROLS
          </h2>
          <button onClick={() => setIsMenuOpen(false)} className="lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* 1. Display Settings */}
          <section className="border-b border-slate-700 pb-2">
            <button onClick={() => toggleSection('settings')} className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Settings size={12} /> Display Settings</span>
              {expandedSections.settings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {expandedSections.settings && (
              <div className="px-2 space-y-3 pt-2 pb-1">
                <button 
                  onClick={() => setIs3D(!is3D)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded border text-[10px] font-bold transition-all ${
                    is3D ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-700 border-slate-500 text-slate-300'
                  }`}
                >
                  {is3D ? <Move3d size={14} /> : <Box size={14} />}
                  {is3D ? '3D MODE ON' : 'SWITCH TO 3D'}
                </button>

                <div className="text-white text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span>Map Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="5" step="0.1" value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {is3D && (
                  <div className="p-2 bg-slate-700/50 rounded border border-slate-600">
                    <div className="text-[10px] text-slate-300 flex justify-between mb-1">
                      <span>Vertical Alt Scale</span>
                      <span>{verticalScale.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="5" step="0.1" value={verticalScale} 
                      onChange={(e) => setVerticalScale(parseFloat(e.target.value))}
                      className="w-full h-1 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. Navigation Layers */}
          <section className="border-b border-slate-700 pb-2">
            <button onClick={() => toggleSection('nav')} className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Navigation size={12} /> Nav Elements</span>
              {expandedSections.nav ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {expandedSections.nav && (
              <div className="px-2 pt-1 flex flex-col gap-1">
                {[
                  { id: 'vor', label: 'VOR / DME', color: 'text-sky-400' },
                  { id: 'fixes', label: 'Waypoints (FIX)', color: 'text-slate-400' },
                  { id: 'runways', label: 'Runways', color: 'text-white' },
                  { id: 'airways', label: 'Airways', color: 'text-slate-500' },
                  { id: 'rnav', label: 'RNAV Routes', color: 'text-indigo-400' },
                  { id: 'direct', label: 'Direct Routes', color: 'text-emerald-500' },
                ].map(layer => (
                  <label key={layer.id} className={`flex items-center gap-3 cursor-pointer text-[11px] ${layer.color} hover:bg-slate-700/50 p-1 px-2 rounded transition-colors`}>
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded bg-slate-900 border-slate-600 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                      checked={!!layers[layer.id]}
                      onChange={() => setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id] }))} 
                    />
                    {layer.label}
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* 3. Safety & Terrain */}
          <section className="border-b border-slate-700 pb-2">
            <button onClick={() => toggleSection('safety')} className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><ShieldAlert size={12} /> Environment</span>
              {expandedSections.safety ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.safety && (
              <div className="px-2 pt-1 flex flex-col gap-1">
                {[
                  { id: 'aca', label: 'ACA Boundary', color: 'text-yellow-400' },
                  { id: 'mva', label: 'MVA Sectors', color: 'text-cyan-400' },
                  { id: 'mva3d', label: 'MVA 3D Planes', color: 'text-cyan-200' },
                  { id: 'terrain', label: 'Terrain Mesh', color: 'text-green-400' },
                ].map(layer => (
                  <label key={layer.id} className={`flex items-center gap-3 cursor-pointer text-[11px] ${layer.color} hover:bg-slate-700/50 p-1 px-2 rounded transition-colors`}>
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded bg-slate-900 border-slate-600 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                      checked={!!layers[layer.id]}
                      onChange={() => setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id] }))} 
                    />
                    {layer.label}
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* 4. RJOH Procedures */}
          <section className="border-b border-slate-700 pb-2">
            <button onClick={() => toggleSection('rjohProc')} className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Radio size={12} /> RJOH Procedures</span>
              {expandedSections.rjohProc ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSections.rjohProc && (
              <div className="px-2 pt-1 space-y-1">
                {Object.keys(PROCEDURES).filter(pid => PROCEDURES[pid].air === 'RJOH').map(pid => (
                  <label key={pid} className="flex items-center gap-3 cursor-pointer text-[11px] hover:bg-slate-700/50 p-1 px-2 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded bg-slate-900 border-slate-600 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                      checked={!!activeProcedures[pid]} 
                      onChange={() => setActiveProcedures(prev => ({ ...prev, [pid]: !prev[pid] }))} 
                    />
                    <span className="text-cyan-400">{pid}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* 5. RJOC Procedures */}
          <section className="pb-2">
            <button onClick={() => toggleSection('rjocProc')} className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Radio size={12} /> RJOC Procedures</span>
              {expandedSections.rjocProc ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedSections.rjocProc && (
              <div className="px-2 pt-1 space-y-1">
                {Object.keys(PROCEDURES).filter(pid => PROCEDURES[pid].air === 'RJOC').map(pid => (
                  <label key={pid} className="flex items-center gap-3 cursor-pointer text-[11px] hover:bg-slate-700/50 p-1 px-2 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded bg-slate-900 border-slate-600 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                      checked={!!activeProcedures[pid]} 
                      onChange={() => setActiveProcedures(prev => ({ ...prev, [pid]: !prev[pid] }))} 
                    />
                    <span className="text-emerald-400">{pid}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

         </div>

        <div className="p-2 border-t border-slate-700 text-[9px] text-slate-500 text-center">
          V92.8 PROTOTYPE
        </div>
      </aside>

      {/* Main Display Area */}
      <div className="flex-1 relative flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          {is3D ? (
            <RadarDisplay3D 
              layers={layers} 
              activeProcedures={activeProcedures} 
              verticalScale={verticalScale} 
            />
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

            {/* Aircraft Layer (Topmost) */}
            {aircrafts.map(ac => {
              const pos = latLonToCanvas(ac.pos.lat, ac.pos.lon, zoom, center);
              const tagX = pos.x + ac.tagOffset.x;
              const tagY = pos.y + ac.tagOffset.y;
              const altStr = Math.round(ac.pos.alt / 100).toString().padStart(3, '0');
              const gsStr = Math.round(ac.vector.gs / 10).toString();
              
              return (
                <g 
                  key={ac.id} 
                  className="cursor-pointer group" 
                  onClick={() => setSelectedAircraftId(ac.id)}
                >
                  {/* Symbol: Arts style circle with dot */}
                  {/* Symbol: Arts style circle with dot */}
                  <circle cx={pos.x} cy={pos.y} r="2.5" fill="none" stroke={selectedAircraftId === ac.id ? "#22d3ee" : "#ffffff"} strokeWidth={selectedAircraftId === ac.id ? "1.5" : "1"} />
                  <circle cx={pos.x} cy={pos.y} r="0.5" fill={selectedAircraftId === ac.id ? "#22d3ee" : "#ffffff"} />
                  {/* Heading Vector (Short Debug line) */}
                  <line
                    x1={pos.x} y1={pos.y}
                    x2={pos.x + Math.sin(ac.vector.hdg * Math.PI / 180) * 10}
                    y2={pos.y - Math.cos(ac.vector.hdg * Math.PI / 180) * 10}
                    stroke="#ffffff" strokeWidth="1" opacity="0.8"
                  />
                  <line x1={pos.x} y1={pos.y} x2={tagX} y2={tagY} stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
                  <g transform={`translate(${tagX}, ${tagY})`}>
                    <rect x="-2" y="-12" width="45" height="24" fill={selectedAircraftId === ac.id ? "rgba(30, 58, 138, 0.8)" : "rgba(15, 23, 42, 0.7)"} rx="2" />
                    <text y="-2" fill="#ffffff" fontSize="10" fontWeight="bold" className="select-none">{ac.callsign}</text>
                    <text y="10" fill="#ffffff" fontSize="10" className="font-mono select-none">{altStr} {gsStr}</text>
                  </g>
                </g>
              );
            })}
          </svg>
          )}
        </div>

        {/* Bottom Panel (ATC Underbar) */}
        <div className="bg-slate-800/95 border-t border-slate-700 z-20 flex flex-col shrink-0">
          <div className="flex h-32 overflow-hidden">
            {/* Target List (ATC Strips) */}
            <div className="w-2/5 min-w-[450px] p-1 flex flex-col gap-1 overflow-y-auto border-r border-slate-700 bg-slate-900/60">
              {aircrafts.map(ac => (
                <div 
                  key={ac.id} 
                  onClick={() => setSelectedAircraftId(ac.id)}
                  className={`p-1 px-3 border-l-4 cursor-pointer flex flex-col transition-all font-mono leading-tight ${
                    selectedAircraftId === ac.id 
                      ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]' 
                      : 'bg-slate-800/40 border-slate-600 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Strip Line 1: CS | DBC | ALT | HDG/FIX | FP | COMM START */}
                  <div className="flex items-center text-[10px] gap-4 border-b border-slate-700/50 pb-0.5">
                    <span className="font-bold text-cyan-400 w-16">{ac.callsign}</span>
                    <span className="w-16 text-slate-400">{ac.departureDestination}</span>
                    <span className="w-10 text-amber-400 font-bold">A{ac.targetAlt/100}</span>
                    <span className="w-20 text-emerald-400 font-bold">
                      {ac.mode === 'VECTOR' ? `H${ac.targetHdg.toString().padStart(3, '0')}` : `- ${ac.targetFix || 'DCT'}`}
                    </span>
                    <span className="flex-1 truncate text-slate-500 text-[9px] uppercase tracking-tighter">{ac.flightPlan.join(' ')}</span>
                    <span className="text-indigo-400 w-8 text-right">{ac.commStart}</span>
                  </div>
                  {/* Strip Line 2: TYPE | IFF | APCH | IDENT | COMM END */}
                  <div className="flex items-center text-[9px] gap-4 pt-0.5 opacity-80">
                    <span className="w-16 text-slate-200">{ac.aircraftType}</span>
                    <span className="w-16">SQ {ac.squawk}</span>
                    <span className={`w-16 font-bold ${ac.isApproachCleared ? 'text-pink-400' : 'text-slate-600'}`}>{ac.isApproachCleared ? 'APCH CLR' : '-------'}</span>
                    <div className="flex-1"></div>
                    <span className="italic text-slate-500">ID:{ac.identTime}</span>
                    <span className="text-indigo-600 w-8 text-right font-bold">{ac.commEnd}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Target View & Command Panel */}
            <div className="flex-1 p-2 overflow-hidden bg-slate-800">
              {selectedAircraftId ? (
                <div className="flex flex-col h-full px-4 justify-center">
                  {aircrafts.filter(ac => ac.id === selectedAircraftId).map(ac => (
                    <React.Fragment key={`cmd-bar-${ac.id}`}>
                      {/* 1-Line Target Summary View */}
                      <div className="flex items-center gap-6 text-[10px] font-mono border-b border-slate-700 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold bg-indigo-600 px-2 py-0.5 rounded tracking-tighter">{ac.callsign}</span>
                          <span className="text-indigo-300 font-bold uppercase">{ac.mode}</span>
                        </div>
                        <div className="flex gap-4 text-slate-300">
                          <span>HDG: <span className="text-emerald-400">{Math.round(ac.vector.hdg).toString().padStart(3, '0')}</span></span>
                          <span>ALT: <span className="text-sky-400">{Math.round(ac.pos.alt)}</span></span>
                        </div>
                        <div className="flex gap-4">
                          <span className={ac.isStarAuthorized ? "text-amber-400 font-bold" : "text-slate-600"}>AUTH: {ac.isStarAuthorized ? 'YES' : 'NO'}</span>
                          <span className={ac.isApproachCleared ? "text-pink-400 font-bold" : "text-slate-600"}>APCH: {ac.isApproachCleared ? 'YES' : 'NO'}</span>
                        </div>
                        {ac.targetFix && (
                          <span className="text-indigo-400 ml-auto font-bold uppercase tracking-widest bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/50">Next: {ac.targetFix}</span>
                        )}
                        <button onClick={() => setSelectedAircraftId(null)} className="p-1 text-slate-500 hover:text-white transition-colors ml-2">
                          <X size={16}/>
                        </button>
                      </div>

                      {/* Control Inputs */}
                      <div className="flex items-center gap-8">
                        <div className="flex-1 max-w-xl grid grid-cols-2 gap-x-8 gap-y-1">
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] text-indigo-400 font-bold uppercase">
                              <span>Set Target Alt</span>
                              <span className="font-mono">{ac.targetAlt} FT</span>
                            </div>
                            <input 
                              type="range" min="1000" max="40000" step="1000" value={ac.targetAlt} 
                              onChange={(e) => updateAircraftTarget(ac.id, { targetAlt: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] text-emerald-400 font-bold uppercase">
                              <span>Set Target Hdg</span>
                              <span className="font-mono">{ac.targetHdg.toString().padStart(3, '0')}°</span>
                            </div>
                            <input 
                              type="range" min="0" max="359" step="1" value={ac.targetHdg} 
                              onChange={(e) => updateAircraftTarget(ac.id, { targetHdg: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {ac.mode === 'VECTOR' ? (
                            <div className="flex gap-1">
                              <select 
                                className="bg-slate-700 text-[9px] text-white border border-slate-600 rounded px-1"
                                value={ac.inductionTarget || ''}
                                onChange={(e) => updateAircraftTarget(ac.id, { inductionTarget: e.target.value })}
                              >
                                {ac.flightPlan.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <button 
                                onClick={() => handleResumeOwnNavigation(ac)}
                                className="py-1 px-3 bg-emerald-600/20 border border-emerald-500/40 rounded text-[9px] text-emerald-400 hover:bg-emerald-600/40 transition-colors uppercase font-bold"
                              >
                                Resume Nav
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <select 
                                className="bg-slate-700 text-[9px] text-white border border-slate-600 rounded px-1"
                                value={ac.targetFix || ''}
                                onChange={(e) => handleReclearedDirect(ac, e.target.value)}
                              >
                                <option value="" disabled>Reclear Direct...</option>
                                {ac.flightPlan.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <button 
                                onClick={() => handleReclearedDirect(ac, ac.flightPlan[ac.flightPlan.length - 1])}
                                className="py-1 px-3 bg-indigo-600/20 border border-indigo-500/40 rounded text-[9px] text-indigo-400 hover:bg-indigo-600/40 transition-colors uppercase font-bold"
                              >
                                Direct Last
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-slate-500 tracking-widest font-bold">
                  SELECT A TARGET ON RADAR OR LIST TO COMMAND
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <footer className="bg-slate-800 p-1 px-4 border-t border-slate-700 text-[10px] text-slate-400 flex justify-between z-10">
          <span>REF: RJOH ARP (35.4933, 133.2391)</span>
          <span className="hidden sm:inline">SWIPE RIGHT FOR MENU</span>
        </footer>
      </div>
    </div>
  );
};

export default RadarDisplay;