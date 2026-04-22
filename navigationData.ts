import { ARP, calcRelativeLatLon, getIntercept, dmsToDeg } from './geoUtils';

export const AIRPORTS = [
  { id: 'RJOH', name: 'Yonago', lat: 35.493333, lon: 133.239167 },
  { id: 'RJOC', name: 'Izumo', lat: 35.413611, lon: 132.890000 },
];

export const VOR_DME = [
  { id: 'JET', name: 'Matsue', lat: 35.531110, lon: 133.094170 },
  { id: 'YGE', name: 'Yonago', lat: 35.493333, lon: 133.239167 },
  { id: 'YME', name: 'Maizuru', lat: 35.480560, lon: 135.136940 },
  { id: 'IYV', name: 'Yonago ILS', lat: 35.48750, lon: 133.22450 },
  { id: 'OYE', name: 'Okayama VOR', lat: dmsToDeg("344501"), lon: dmsToDeg("1335006") },
  { id: 'KMC', name: 'Komatsu VOR', lat: dmsToDeg("362347.36"), lon: dmsToDeg("1362418.49") },
];

const IYV_LAT = 35.48750;
const IYV_LON = 133.22450;

// FIX Variables
export const INABA = { id: 'INABA', lat: 35.7433, lon: 133.7154 };
export const NIIMI = { id: 'NIIMI', lat: 35.1545, lon: 133.2758 };
export const DOZEN = { id: 'DOZEN', lat: 36.0227, lon: 133.3188 };
export const MIYOS = { id: 'MIYOS', lat: dmsToDeg("345336.99"), lon: dmsToDeg("1324955.39") };
export const TOZAN = { id: 'TOZAN', lat: 35.27083, lon: 134.48444 };
export const STAGE = { id: 'STAGE', lat: 35.58103, lon: 132.69325 };
export const OH501 = { id: 'OH501', lat: 35.45869, lon: 133.37969 };
export const OH701 = { id: 'OH701', lat: 35.59233, lon: 133.41219 };
export const OH703 = { id: 'OH703', lat: 35.67739, lon: 133.32756 };
export const YAPPA = { id: 'YAPPA', lat: 35.6183, lon: 133.4773 };
export const GAINA = { id: 'GAINA', lat: 35.60653, lon: 133.52406 };
export const KYURI = { id: 'KYURI', lat: 35.39431, lon: 132.99183 };
export const RAKDA_H = { id: 'RAKDA_H', lat: 35.51947, lon: 133.64008 };
export const FAF18 = { id: 'FAF18', lat: 35.6248, lon: 133.5654 };
export const DAIEI = { id: 'DAIEI', lat: dmsToDeg("353038.29"), lon: dmsToDeg("1334210.40") };
export const OH561 = { id: 'OH561', lat: 35.67564, lon: 133.48303 };
export const OH762 = { id: 'OH762', lat: 35.47156, lon: 133.49961 };
export const OH761 = { id: 'OH761', lat: 35.31336, lon: 133.04031 };
export const OH763 = { id: 'OH763', lat: 35.54181, lon: 132.87264 };
export const PEPOS = { id: 'PEPOS', lat: 35.71736, lon: 132.73003 };
export const YUBAR = { id: 'YUBAR', lat: dmsToDeg("350052"), lon: dmsToDeg("1333511") };
export const IWT = { id: 'IWT', lat: dmsToDeg("340447.64"), lon: dmsToDeg("1320850.31") };
export const SAMBA = { id: 'SAMBA', lat: dmsToDeg("350526"), lon: dmsToDeg("1320324") };
export const OSPEL = { id: 'OSPEL', lat: dmsToDeg("350904"), lon: dmsToDeg("1321524") };
export const VIBEL = { id: 'VIBEL', lat: dmsToDeg("351234"), lon: dmsToDeg("1322707") };
export const LATOR = { id: 'LATOR', lat: dmsToDeg("351923"), lon: dmsToDeg("1324627") };
export const DULOK = { id: 'DULOK', lat: dmsToDeg("352714"), lon: dmsToDeg("1330859") };
export const ADLEB = { id: 'ADLEB', lat: dmsToDeg("352952"), lon: dmsToDeg("1331635") };
export const ORUDA = { id: 'ORUDA', lat: dmsToDeg("353133"), lon: dmsToDeg("1332129") };
export const SAKYU = { id: 'SAKYU', lat: dmsToDeg("355501"), lon: dmsToDeg("1343105") };
export const LEPGU = { id: 'LEPGU', lat: dmsToDeg("353029"), lon: dmsToDeg("1340927") };
export const YAKMO = { id: 'YAKMO', lat: dmsToDeg("353012"), lon: dmsToDeg("1324647") };
export const OPERA = { id: 'OPERA', lat: dmsToDeg("352950"), lon: dmsToDeg("1324237") };
export const ENRUN = { id: 'ENRUN', lat: dmsToDeg("352736"), lon: dmsToDeg("1321817") };
export const KALEK = { id: 'KALEK', lat: dmsToDeg("351232"), lon: dmsToDeg("1295305") };
export const TAREB = { id: 'TAREB', lat: dmsToDeg("354406"), lon: dmsToDeg("1350921") };
export const SOUJA = { id: 'SOUJA', lat: dmsToDeg("343739"), lon: dmsToDeg("1334422") };
export const SAEKI = { id: 'SAEKI', lat: dmsToDeg("345708"), lon: dmsToDeg("1340350") };
export const TONBI = { id: 'TONBI', lat: dmsToDeg("351053"), lon: dmsToDeg("1340104") };
export const CARPS = { id: 'CARPS', lat: dmsToDeg("342425"), lon: dmsToDeg("1322134") };
export const RUTGO = { id: 'RUTGO', lat: dmsToDeg("345954"), lon: dmsToDeg("1324444") };
export const ATPOD = { id: 'ATPOD', lat: dmsToDeg("354055"), lon: dmsToDeg("1333831") };
export const KABKI = { id: 'KABKI', lat: dmsToDeg("354514"), lon: dmsToDeg("1323929") };
export const FOGEL = { id: 'FOGEL', lat: dmsToDeg("360626"), lon: dmsToDeg("1315743") };
export const AKANA = { id: 'AKANA', lat: dmsToDeg("345748.47"), lon: dmsToDeg("1324904.75") };
export const KIJJY = { id: 'KIJJY', lat: dmsToDeg("350901.80"), lon: dmsToDeg("1340554.93") };

// Airways Points
export const LANAT = { id: 'LANAT', lat: dmsToDeg("362224"), lon: dmsToDeg("1312542") };
export const DANJU = { id: 'DANJU', lat: dmsToDeg("353733.90"), lon: dmsToDeg("1323440.85") };
export const TRE = { id: 'TRE', lat: dmsToDeg("353138.28"), lon: dmsToDeg("1340953.59") };
export const KANNA = { id: 'KANNA', lat: dmsToDeg("353011.27"), lon: dmsToDeg("1344121.95") };
export const HGE = { id: 'HGE', lat: dmsToDeg("342601.59"), lon: dmsToDeg("1325526.29") };
export const KYOKA = { id: 'KYOKA', lat: dmsToDeg("351046.37"), lon: dmsToDeg("1325153.70") };
export const OIE = { id: 'OIE', lat: 36.5000, lon: 133.6000 };
export const SAPRA = { id: 'SAPRA', lat: dmsToDeg("354925.83"), lon: dmsToDeg("1304325.23") };
export const IGRAS = { id: 'IGRAS', lat: dmsToDeg("371845.35"), lon: dmsToDeg("1324410.38") };

export const FIXES = [
  INABA, NIIMI, DOZEN, MIYOS, TOZAN, STAGE, OH501, OH701, OH703, YAPPA, GAINA, KYURI, RAKDA_H, FAF18, OH561, OH762, OH761, OH763, PEPOS, DAIEI,
  LANAT, DANJU, TRE, KANNA, HGE, KYOKA, OIE, SAPRA, IGRAS,
  YUBAR, IWT, SAMBA, OSPEL, VIBEL, LATOR, DULOK, ADLEB, ORUDA, SAKYU, LEPGU, YAKMO, OPERA, ENRUN, KALEK, TAREB, SOUJA, SAEKI, TONBI, CARPS, RUTGO, ATPOD, KABKI, FOGEL,
  AKANA, KIJJY,
  { id: 'MINAT', ...calcRelativeLatLon(35.53111, 133.09417, 81, 17.0) },
  { id: 'tIF', ...calcRelativeLatLon(35.53111, 133.09417, 107, 17.0) },
  { id: 'tFAF', ...calcRelativeLatLon(35.53111, 133.09417, 107, 12.0) },
  { id: 'UGEPA', lat: 35.39824, lon: 133.28590 },
  { id: 'OH753', lat: 35.40965, lon: 133.24319 },
  { id: 'OH754', lat: 35.42034, lon: 133.20311 },
  { id: 'OH755', lat: 35.47702, lon: 133.19826 },
  { id: 'RW07', lat: 35.48843, lon: 133.22683 },
  { id: 'RW25', lat: 35.49843, lon: 133.25083 },
  { id: 'IF25', ...calcRelativeLatLon(IYV_LAT, IYV_LON, 73, 21.8) },
  { id: 'ATMIK', ...calcRelativeLatLon(IYV_LAT, IYV_LON, 111, 21.8) },
  { id: 'SEKKY', ...calcRelativeLatLon(IYV_LAT, IYV_LON, 48, 15.9) },
  { id: 'MIHOU', lat: 35.5311, lon: 133.0939 },
  { id: 'KAIKE', lat: 35.4958, lon: 133.2870 },
  { id: 'RAKDA', lat: 35.5195, lon: 133.6401 },
  { id: 'OC511', lat: 35.4655, lon: 132.9807 },
  { id: 'TSUNO', lat: 35.3329, lon: 134.1534 },
  { id: 'TAKHI', lat: 36.1114, lon: 133.1208 },
  { id: 'SAIGO', lat: 35.9944, lon: 133.4140 },
  { id: 'SUSAR', lat: 35.2321, lon: 132.8552 },
  { id: 'AMAKO', lat: 35.3491, lon: 133.1723 },
  { id: 'OKUNI', lat: 35.4035, lon: 132.6288 },
  { id: 'WATCH', lat: 35.5906, lon: 132.9852 },
  { id: 'YOKAI', lat: 35.5642, lon: 133.2325 },
  { id: 'NAKAU', lat: 35.5451, lon: 133.1629 },
  { id: 'OC711', lat: dmsToDeg("354844.8"), lon: dmsToDeg("1330225.0") },
  { id: 'OC712', lat: dmsToDeg("353016.6"), lon: dmsToDeg("1330034.0") },
  { id: 'OC713', lat: dmsToDeg("354431.8"), lon: dmsToDeg("1331217.8") },
  { id: 'ENMUH', lat: 35.23122, lon: 132.75346 },
  { id: 'SUBIE', lat: 35.31737, lon: 132.69121 },
];

export const RUNWAYS = [
  { air: 'RJOH', id: '07', lat: 35.48843, lon: 133.22683 },
  { air: 'RJOH', id: '25', lat: 35.49843, lon: 133.25083 },
];

const RJOC_ARP = { lat: 35.413611, lon: 132.890000 };
const rnp_ctr = calcRelativeLatLon(35.47702, 133.19826, 154, 1.8);

// 補助計算点 (米子)
const i25p1 = calcRelativeLatLon(ARP.lat, ARP.lon, 252, 2.0);
const i25c1 = calcRelativeLatLon(i25p1.lat, i25p1.lon, 162, 2.0);
const i25p2_inaba = calcRelativeLatLon(i25c1.lat, i25c1.lon, 105, 2.0); // HDG 015 への離脱点
const i25vtx_inaba = getIntercept(i25p2_inaba, 15, ARP, 60); // HDG 015 と YGE R-060 の交点
const i07p1 = calcRelativeLatLon(ARP.lat, ARP.lon, 65, 3.0);
const i07vtx = getIntercept(i07p1, 55, ARP, 60);
const s25p1 = calcRelativeLatLon(ARP.lat, ARP.lon, 252, 2.0);
const s25c1_south = calcRelativeLatLon(s25p1.lat, s25p1.lon, 162, 2.0);
const s25p2_south = calcRelativeLatLon(s25c1_south.lat, s25c1_south.lon, 220, 2.0); // SOUTH方面への旋回 (HDG 130)
const s25c1_dozen = calcRelativeLatLon(s25p1.lat, s25p1.lon, 162, 1.273);
const s25p2_dozen = calcRelativeLatLon(s25c1_dozen.lat, s25c1_dozen.lon, 97, 1.273); // HDG 007 への接線 (YGE R-007 厳密合流)
const s25vtx = getIntercept(s25p2_south, 130, ARP, 175);
const i07p1_dozen = calcRelativeLatLon(ARP.lat, ARP.lon, 72, 2.0);
const i07c1_dozen = calcRelativeLatLon(i07p1_dozen.lat, i07p1_dozen.lon, 342, 2.0);
const i07p2_dozen = calcRelativeLatLon(i07c1_dozen.lat, i07c1_dozen.lon, 52, 2.0); // HDG 322 への離脱点
const i07vtx_dozen = getIntercept(i07p2_dozen, 322, ARP, 7); // HDG 322 と YGE R-007 の交点
const i07p1_inaba = calcRelativeLatLon(ARP.lat, ARP.lon, 72, 3.0);
const i07vtx_inaba = getIntercept(i07p1_inaba, 55, ARP, 60);
const s07p1 = calcRelativeLatLon(ARP.lat, ARP.lon, 72, 2.0);
const s07c1 = calcRelativeLatLon(s07p1.lat, s07p1.lon, 162, 2.0); // 右旋回中心 (072+90)
const s07p2 = calcRelativeLatLon(s07c1.lat, s07c1.lon, 130, 2.0); // HDG 220 への離脱点 (220-90)
const s07vtx = getIntercept(s07p2, 220, ARP, 175);
const u25p1 = calcRelativeLatLon(ARP.lat, ARP.lon, 252, 2.0);
const u25c1 = calcRelativeLatLon(u25p1.lat, u25p1.lon, 162, 3.0);
const u25p2 = calcRelativeLatLon(u25c1.lat, u25c1.lon, 153, 3.0);
const ms_arc_end = calcRelativeLatLon(ARP.lat, ARP.lon, 218, 20.4);

// 補助計算点 (出雲)
const oc_p250_4 = calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 250, 4);
const c_r2nm_d25 = calcRelativeLatLon(oc_p250_4.lat, oc_p250_4.lon, 340, 2);
const p_exit_hdg77 = calcRelativeLatLon(c_r2nm_d25.lat, c_r2nm_d25.lon, 347, 2);
const p_intercept_dozen_25 = getIntercept(p_exit_hdg77, 77, RJOC_ARP, 33);
const oc_p070_2 = calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 70, 2);
const p_intercept_dozen_07 = getIntercept(oc_p070_2, 360, RJOC_ARP, 33);
const oc_p253_m25 = calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 253, 5.97); // 旋回開始点（接点）
const c_r2nm_m25 = calcRelativeLatLon(oc_p253_m25.lat, oc_p253_m25.lon, 343, 2.0); // 調整された旋回中心
const p_m25_exit = calcRelativeLatLon(c_r2nm_m25.lat, c_r2nm_m25.lon, 355, 2.0); // HDG 085 離脱点
const oc_p073_2 = calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 73, 2.0);
const p_r2nm_hdg30 = calcRelativeLatLon(c_r2nm_d25.lat, c_r2nm_d25.lon, 300, 2);

export const PROCEDURES = {
  // RJOH
  'INABA_25': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: i25p1 }, { from: i25p1, to: i25p2_inaba, center: i25c1, type: 'arc', radius: 2.0, sweep: 0, largeArc: 1 }, { from: i25p2_inaba, to: i25vtx_inaba }, { from: i25vtx_inaba, to: 'INABA' }] },
  'INABA_07': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: i07p1_inaba }, { from: i07p1_inaba, to: i07vtx_inaba }, { from: i07vtx_inaba, to: 'INABA' }] },
  'SOUTH_25': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: s25p1 }, { from: s25p1, to: s25p2_south, center: s25c1_south, type: 'arc', radius: 2.0, sweep: 0 }, { from: s25p2_south, to: s25vtx }, { from: s25vtx, to: 'NIIMI' }] },
  'SOUTH_07': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: s07p1 }, { from: s07p1, to: s07p2, center: s07c1, type: 'arc', radius: 2.0, sweep: 1 }, { from: s07p2, to: s07vtx }, { from: s07vtx, to: 'NIIMI' }] },
  'DOZEN_25': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: s25p1 }, { from: s25p1, to: s25p2_dozen, center: s25c1_dozen, type: 'arc', radius: 1.273, sweep: 0, largeArc: 1 }, { from: s25p2_dozen, to: 'DOZEN' }] },
  'DOZEN_07': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: i07p1_dozen }, { from: i07p1_dozen, to: i07p2_dozen, center: i07c1_dozen, type: 'arc', radius: 2.0, sweep: 0 }, { from: i07p2_dozen, to: i07vtx_dozen }, { from: i07vtx_dozen, to: 'DOZEN' }] },
  'USAGI_25': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: u25p1 }, { from: u25p1, to: u25p2, center: u25c1, type: 'arc', radius: 3.0, sweep: 0, largeArc: 1 }, { from: u25p2, to: 'OH501' }, { from: 'OH501', to: 'YAPPA' }, { from: 'YAPPA', to: 'INABA' }] },
  'USAGI_07': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: calcRelativeLatLon(ARP.lat, ARP.lon, 64, 4.0) }, { from: calcRelativeLatLon(ARP.lat, ARP.lon, 64, 4.0), to: 'YAPPA' }, { from: 'YAPPA', to: 'INABA' }] },
  'STAGE_25': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: u25p1 }, { from: u25p1, to: u25p2, center: u25c1, type: 'arc', radius: 3.0, sweep: 0, largeArc: 1 }, { from: u25p2, to: 'OH501' }, { from: 'OH501', to: 'OH701' }, { from: 'OH701', to: 'OH703' }, { from: 'OH703', to: 'STAGE' }] },  'STAGE_07': { air: 'RJOH', type: 'SID', dash: '10, 5', routes: [{ from: ARP, to: calcRelativeLatLon(ARP.lat, ARP.lon, 64, 4.0) }, { from: calcRelativeLatLon(ARP.lat, ARP.lon, 64, 4.0), to: 'OH701' }, { from: 'OH701', to: 'OH703' }, { from: 'OH703', to: 'STAGE' }] },

  // RJOH TRSN (遷移)
  'MS_TR': { air: 'RJOH', type: 'TRSN', dash: '20, 5', routes: [{ from: 'NIIMI', to: ms_arc_end, center: ARP, type: 'arc', radius: 20.4, sweep: 1 }, { from: ms_arc_end, to: 'MIYOS' }] },
  'TZ_TR': { air: 'RJOH', type: 'TRSN', dash: '20, 5', routes: [{ from: 'INABA', to: 'TOZAN' }] },
  'MZ_TR': { air: 'RJOH', type: 'TRSN', dash: '20, 5', routes: [{ from: 'INABA', to: 'YME' }] },

  // RJOH STAR (到着)
  'GAINA_EAST': { air: 'RJOH', type: 'STAR', dash: '5, 3', routes: [{ from: 'RAKDA_H', to: 'GAINA' }] },
  'GAINA_WEST': { air: 'RJOH', type: 'STAR', dash: '5, 3', routes: [{ from: 'PEPOS', to: 'OH561' }, { from: 'OH561', to: 'GAINA' }] },
  'KYURI_EAST': { air: 'RJOH', type: 'STAR', dash: '5, 3', routes: [{ from: 'RAKDA_H', to: 'OH762' }, { from: 'OH762', to: 'OH761' }, { from: 'OH761', to: 'KYURI' }] },
  'KYURI_WEST': { air: 'RJOH', type: 'STAR', dash: '5, 3', routes: [{ from: 'PEPOS', to: 'OH763' }, { from: 'OH763', to: 'KYURI' }] },

  // RJOH IAP (進入)
  'ILS_Z_25': { air: 'RJOH', type: 'IAP', dash: '2, 2', routes: [{ from: 'ATMIK', to: 'DAIEI', center: 'IYV', type: 'arc', radius: 21.8, sweep: 0 }, { from: 'DAIEI', to: 'IF25', center: 'IYV', type: 'arc', radius: 21.8, sweep: 0 }, { from: 'IF25', to: 'FAF18' }, { from: 'FAF18', to: 'RW25' }] },
  'ILS_X_25': { air: 'RJOH', type: 'IAP', dash: '2, 2', routes: [{ from: 'SEKKY', to: 'GAINA', center: 'IYV', type: 'arc', radius: 15.9, sweep: 1 }, { from: 'GAINA', to: 'YUMII' }, { from: 'YUMII', to: 'RW25' }] },
  'RNP_Z_07': { air: 'RJOH', type: 'IAP', dash: '2, 2', routes: [{ from: 'KYURI', to: 'RW07' }] },
  'RNP_Y_07': { air: 'RJOH', type: 'IAP', dash: '2, 2', routes: [{ from: 'RAKDA_H', to: 'UGEPA' }, { from: 'UGEPA', to: 'OH753' }, { from: 'OH753', to: 'OH754' }, { from: 'OH754', to: 'OH755', center: rnp_ctr, type: 'arc', radius: 1.8, sweep: 1 }, { from: 'OH755', to: 'RW07' }] },
  'TACAN_A': { air: 'RJOH', type: 'IAP', dash: '2, 2', routes: [{ from: 'MINAT', to: 'tIF', center: 'JET', type: 'arc', radius: 17.0, sweep: 1 }, { from: 'tIF', to: 'tFAF' }, { from: 'tFAF', to: 'RW07' }] },

  // RJOC
  'DOZEN_25_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p250_4 }, { from: oc_p250_4, to: p_exit_hdg77, center: c_r2nm_d25, type: 'arc', radius: 2, sweep: 1 }, { from: p_exit_hdg77, to: p_intercept_dozen_25 }, { from: p_intercept_dozen_25, to: 'DOZEN' }] },
  'DOZEN_07_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p070_2 }, { from: oc_p070_2, to: p_intercept_dozen_07 }, { from: p_intercept_dozen_07, to: 'DOZEN' }] },
  'MATSUE_25_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p253_m25 }, { from: oc_p253_m25, to: p_m25_exit, center: c_r2nm_m25, type: 'arc', radius: 2.0, sweep: 1, largeArc: 1 }, { from: p_m25_exit, to: 'OC511' }, { from: 'OC511', to: 'MIHOU' }, { from: 'MIHOU', to: 'KAIKE' }, { from: 'KAIKE', to: 'TSUNO' }] },
  'MATSUE_07_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 70, 2) }, { from: calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 70, 2), to: 'OC511' }, { from: 'OC511', to: 'MIHOU' }, { from: 'MIHOU', to: 'KAIKE' }, { from: 'KAIKE', to: 'TSUNO' }] },
  'TAKHI_25_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p250_4 }, { from: oc_p250_4, to: p_r2nm_hdg30, center: c_r2nm_d25, type: 'arc', radius: 2, sweep: 1 }, { from: p_r2nm_hdg30, to: 'OC711' }, { from: 'OC711', to: 'TAKHI' }] },
  'TAKHI_07_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p073_2 }, { from: oc_p073_2, to: 'OC711' }, { from: 'OC711', to: 'TAKHI' }] },
  'SAIGO_25_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p250_4 }, { from: oc_p250_4, to: p_r2nm_hdg30, center: c_r2nm_d25, type: 'arc', radius: 2, sweep: 1 }, { from: p_r2nm_hdg30, to: 'OC713' }, { from: 'OC713', to: 'SAIGO' }] },
  'SAIGO_07_OC': { air: 'RJOC', type: 'SID', dash: '10, 5', routes: [{ from: RJOC_ARP, to: oc_p073_2 }, { from: oc_p073_2, to: 'OC712' }, { from: 'OC712', to: 'OC713' }, { from: 'OC713', to: 'SAIGO' }] },

  // RJOC STAR
  'SUSAR_STAR': { air: 'RJOC', type: 'STAR', dash: '5, 3', routes: [{ from: 'RAKDA', to: 'AMAKO' }, { from: 'AMAKO', to: 'SUSAR' }] },
  'OKUNI_STAR': { air: 'RJOC', type: 'STAR', dash: '5, 3', routes: [{ from: 'RAKDA', to: 'YOKAI' }, { from: 'YOKAI', to: 'WATCH' }, { from: 'WATCH', to: 'OKUNI' }] },
  'NAKAU_STAR': { air: 'RJOC', type: 'STAR', dash: '5, 3', routes: [{ from: 'RAKDA', to: 'NAKAU' }] },

  // RJOC IAP
  'RNP07_SUSAR': { air: 'RJOC', type: 'IAP', dash: '2, 2', routes: [{ from: 'SUSAR', to: 'ENMUH' }, { from: 'ENMUH', to: 'SUBIE' }, { from: 'SUBIE', to: RJOC_ARP }] },
  'RNP07_OKUNI': { air: 'RJOC', type: 'IAP', dash: '2, 2', routes: [{ from: 'OKUNI', to: 'SUBIE' }, { from: 'SUBIE', to: RJOC_ARP }] },
  'RNP25': { air: 'RJOC', type: 'IAP', dash: '2, 2', routes: [{ from: 'NAKAU', to: RJOC_ARP }] }
};

export const MVA_RINGS = [3, 7, 9, 10, 13, 15, 18, 25, 30, 35, 40, 50];

export const ACA_POINTS_NM = { 1:{x:23.85,y:-7.45}, 2:{x:-9.3,y:-23.2}, 3:{x:13.5,y:-5.6}, 4:{x:-7.2,y:-17.7}, 5:{x:24.8,y:6.3}, 6:{x:-26.25,y:21.5}, 7:{x:-15.1,y:-30.4}, 8:{x:-1.9,y:6.6}, 9:{x:22.3,y:13.2}, 10:{x:14.8,y:31.5}, 11:{x:28.8,y:19.1}, 12:{x:-8.5,y:33.3} };

export const MVA_MANUAL_ARCS = [ 
  {r:3,start:250,end:335},{r:3,start:125,end:250},{r:10,start:335,end:35},{r:15,start:290,end:50},
  {r:25,start:110,end:50},{r:25,start:335,end:360},{r:25,start:290,end:335},{r:25,start:145,end:335},
  {r:35,start:360,end:35},{r:40,start:35,end:360},{r:40,start:145,end:360},{r:50,start:0,end:360,isFull:true},
  {r:30,start:50,end:87},{r:30,start:110,end:145},{r:7,start:87,end:125},{r:7,start:110,end:125},
  {r:9,start:87,end:242},{r:13,start:100,end:145},{r:13,start:210,end:225},{r:15,start:145,end:205},
  {r:15,start:225,end:235},{r:15,start:290,end:335},{r:18,start:235,end:290},{r:18,start:210,end:225},
  {r:18,start:205,end:210} 
];

export const MVA_MANUAL_RADIALS = [ 
  {deg:360,r1:35,r2:40},{deg:20,r1:25,r2:35},{deg:35,r1:10,r2:50},{deg:50,r1:0,r2:50},
  {deg:87,r1:7,r2:40},{deg:100,r1:9,r2:13},{deg:100,r1:13,r2:50},{deg:110,r1:13,r2:50},
  {deg:145,r1:13,r2:50},{deg:210,r1:9,r2:13},{deg:242,r1:9,r2:18},{deg:268,r1:3,r2:18},
  {deg:205,r1:15,r2:18},{deg:225,r1:13,r2:15},{deg:225,r1:18,r2:25},{deg:235,r1:15,r2:18},
  {deg:290,r1:15,r2:18},{deg:335,r1:3,r2:40},{deg:125,r1:3,r2:9},{deg:250,r1:0,r2:3} 
];

export const MVA_LABELS = [ 
  {alt:"25",label:{deg:5,r:5}},{alt:"40",label:{deg:5,r:12.5}},{alt:"50",label:{deg:5,r:20}},{alt:"90",label:{deg:355,r:32.5}},
  {alt:"110",label:{deg:0,r:45}},{alt:"40",label:{deg:42.5,r:32.5}},{alt:"60",label:{deg:27,r:30}},{alt:"30",label:{deg:42,r:20}},
  {alt:"50",label:{deg:42,r:45}},{alt:"15",label:{deg:70,r:12}},{alt:"20",label:{deg:68,r:35}},{alt:"30",label:{deg:105,r:8}},
  {alt:"35",label:{deg:93,r:25}},{alt:"55",label:{deg:105,r:25}},{alt:"40",label:{deg:75,r:45}},{alt:"70",label:{deg:105,r:45}},
  {alt:"26",label:{deg:180,r:7}},{alt:"55",label:{deg:185,r:20}},{alt:"32",label:{deg:226,r:12}},{alt:"40",label:{deg:255,r:21.5}},
  {alt:"80",label:{deg:127,r:19}},{alt:"100",label:{deg:127,r:27.5}},{alt:"130",label:{deg:127,r:35}},{alt:"160",label:{deg:127,r:45}},
  {alt:"70",label:{deg:240,r:32.5}},{alt:"30",label:{deg:305,r:10}} 
];

// 基準点がARP（Yonago）ではない、または複雑な多角形で構成されるMVAセクタ (RJOC基準は削除)
export const MVA_COMPLEX_SECTORS = [];

export const AIRWAYS = [
  { 
    id: 'G597', 
    waypoints: [
      { id: 'LANAT', alt: 24000 }, 
      { id: 'DANJU', alt: 8000 }, 
      { id: 'RJOC', alt: 4000 }, 
      { id: 'RJOH', alt: 7000 }, 
      { id: 'DAIEI', alt: 6000 }, 
      { id: 'TRE', alt: 7000 }, 
      { id: 'KANNA' }
    ], 
    color: '#94a3b8' 
  },
  { 
    id: 'V29', 
    waypoints: [
      { id: 'HGE', alt: 7000 }, 
      { id: 'MIYOS', alt: 9000 }, 
      { id: 'KYOKA', alt: 7000 }, 
      { id: 'RJOC', alt: 4000 }, 
      { id: 'DOZEN', alt: 4000 }, 
      { id: 'OIE' }
    ], 
    color: '#94a3b8' 
  },
  { 
    id: 'G585', 
    waypoints: [
      { id: 'SAPRA', alt: 22000 }, 
      { id: 'RJOC' }
    ], 
    color: '#94a3b8' 
  },
  { 
    id: 'B332', 
    waypoints: [
      { id: 'RJOC', alt: 26000 }, 
      { id: 'IGRAS' }
    ], 
    color: '#94a3b8' 
  }
];

export const RNAV_ROUTES = [
  { id: 'Y597', waypoints: [{id:'FOGEL', alt:8000}, {id:'KABKI', alt:8000}, {id:'PEPOS', alt:8000}, {id:'MIHOU'}], color: '#818cf8' },
  { id: 'Y38', waypoints: [{id:'SAPRA', alt:20000}, {id:'STAGE', alt:16000}, {id:'MIHOU', alt:8000}, {id:'ADLEB', alt:8000}, {id:'TSUNO', alt:9000}, {id:'TOZAN'}], color: '#818cf8' },
  { id: 'Y206', waypoints: [{id:'KALEK', alt:19000}, {id:'ENRUN', alt:19000}, {id:'OPERA', alt:19000}, {id:'YAKMO', alt:19000}, {id:'MIHOU'}], color: '#818cf8' },
  { id: 'Y143', waypoints: [{id:'SAMBA', alt:7000}, {id:'OSPEL', alt:7000}, {id:'VIBEL', alt:7000}, {id:'LATOR', alt:8000}, {id:'DULOK', alt:8000}, {id:'ADLEB', alt:8000}, {id:'ORUDA', alt:16000}, {id:'SAKYU'}], color: '#818cf8' },
  { id: 'Y45', waypoints: [{id:'CARPS', alt:7000}, {id:'RUTGO', alt:7000}, {id:'KYOKA', alt:7000}, {id:'MIHOU', alt:16000}, {id:'ATPOD', alt:16000}, {id:'SAKYU'}], color: '#818cf8' },
  { id: 'Y324', waypoints: [{id:'SOUJA', alt:16000}, {id:'YAKMO', alt:16000}, {id:'STAGE'}], color: '#818cf8' },
  { id: 'Y287', waypoints: [{id:'MIHOU', alt:7000}, {id:'DULOK', alt:7000}, {id:'SOUJA'}], color: '#818cf8' },
  { id: 'Y39', waypoints: [{id:'MIHOU', alt:8000}, {id:'YUBAR', alt:5000}, {id:'OYE'}], color: '#818cf8' },
  { id: 'Y361', waypoints: [{id:'MIHOU', alt:13000}, {id:'TONBI', alt:13000}, {id:'SAEKI'}], color: '#818cf8' },
  { id: 'Y188', waypoints: [{id:'RAKDA', alt:8000}, {id:'TOZAN'}], color: '#818cf8' },
  { id: 'Y18', waypoints: [{id:'YME', alt:7000}, {id:'LEPGU', alt:7000}, {id:'RAKDA', alt:7000}, {id:'ORUDA', alt:7000}, {id:'MIHOU'}], color: '#818cf8' },
  { id: 'Y22', waypoints: [{id:'TAREB', alt:20000}, {id:'MIHOU'}], color: '#818cf8' }
];

export const DIRECT_ROUTES = [
  { id: 'DCT-IWT', waypoints: [{id:'IWT', alt:7000}, {id:'KYOKA', alt:7000}, {id:'JET', alt:4000}, {id:'OIE'}], color: '#10b981' },
  { id: 'DCT-SAMBA', waypoints: [{id:'SAMBA', alt:7000}, {id:'RJOC'}], color: '#10b981' },
  { id: 'DCT-KYOKA-OC', waypoints: [{id:'KYOKA', alt:7000}, {id:'RJOC'}], color: '#10b981' },
  { id: 'DCT-YUBAR-OC', waypoints: [{id:'YUBAR', alt:10000}, {id:'XZE25', ...calcRelativeLatLon(RJOC_ARP.lat, RJOC_ARP.lon, 125, 25), alt:6000}, {id:'RJOC'}], color: '#10b981' },
  { id: 'DCT-KYOKA-OH', waypoints: [{id:'KYOKA', alt:7000}, {id:'YGE'}], color: '#10b981' },
  { id: 'DCT-OYE', waypoints: [{id:'OYE', alt:5000}, {id:'YUBAR', alt:7000}, {id:'YGE', alt:8000}, {id:'ATMIK', alt:9000}, {id:'TSUNO'}], color: '#10b981' },
  { id: 'DCT-JET', waypoints: [{id:'JET', alt:17000}, {id:'SAKYU'}], color: '#10b981' },
  { id: 'DCT-KABKI', waypoints: [{id:'KABKI', alt:20000}, {id:'STAGE', alt:18000}, {id:'OPERA', alt:15000}, {id:'AKANA', alt:7000}, {id:'MIYOS', alt:7000}, {id:'HGE'}], color: '#10b981' },
  { id: 'DCT-SAEKI', waypoints: [{id:'SAEKI', alt:13000}, {id:'KIJJY', alt:13000}, {id:'TRE', alt:16000}, {id:'KMC'}], color: '#10b981' },
  { id: 'DCT-TRE', waypoints: [{id:'TRE', alt:7000}, {id:'TOZAN', alt:9000}], color: '#10b981' }
];