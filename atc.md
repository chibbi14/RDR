ATC 管制官訓練システム：最終統合設計書 (v1.2)

1. 概念設計

本システムは、3Dで定義された高度制限（MVA）および飛行経路（SID/STAR/APCH）データを基盤とし、管制官の指示による「ベクタリング（手動介入）」と「自律飛行（経路遵守）」をシームレスに切り替えるシミュレーションエンジンである。

2. 航法モード定義 (Navigation Modes)

モード

名称

挙動

PROC

自律飛行モード

予定された3D経路、高度制限、速度制限を自動で遵守する。

VECTOR

レーダー誘導モード

指定された方位（Heading）を維持。3D経路からは離脱する。

DIRECT

直行モード

指定されたFIXへ最短距離で向かう。

3. 指令ロジックとステート遷移 (Command Logic)

3.1 自律飛行への復帰 (Resume Own Navigation)

コマンド: "Resume own navigation direct [Fix]"

ロジック:

指定された Fix が、機体に割り当てられている飛行予定経路（Flight Plan）上に存在するか検索。

存在する場合: モードを PROC に変更。機体はそのFixへ向かい、到着後は以降のパス、高度制限、速度制限を自動追従する。

存在しない場合: 指定Fixへの DIRECT モードとして継続し、到着後は現在の高度・方位を維持する（待機状態）。

3.2 到着経路・進入承認 (Clearance)

STARの承認: "Cleared via [Arrival Name] Arrival"

効果: isStarAuthorized を true に設定。

挙動: 指定されたSTARのパスおよび高度・速度制限の遵守が許可される。MSAW（最低安全高度警告）の判定をSTAR高度制限に委ねる。

アプローチの承認: "Cleared for [Type] Approach"

効果: isApproachCleared を true に設定。

挙動: 最終進入経路（ILS/RNAVパス等）の追従を開始。MSAW判定をバイパス（Inhibit）する。

4. 安全監視システム (Safety Nets)

4.1 MSAW (Minimum Safe Altitude Warning)

判定ロジック: Aircraft.alt < Current_Sector.MVA

警告抑制 (Inhibit): 以下のいずれかが true の場合は警告を出さない。

isApproachCleared == true

isStarAuthorized == true かつ 機体が経路上にあり、かつ経路上の制限高度に従っている場合。

UI表示: データブロック内の高度表示を黄色で点滅。

4.2 STCA (Short Term Conflict Alert)

判定: 2機間の距離が 3.0NM かつ 高度差が 1,000ft 未満。

UI表示: 該当する全機のデータブロックを赤色反転。

5. UI/UX 仕様 (ARTS Data Block)

5.1 データブロック構成

Line 1: コールサイン（例: ANA171）

Line 2: 高度(100ft単位)  地速(10kt単位)（例: 070 21 → 7,000ft, 210kt）

インタラクション:

ターゲットシンボル（〇や＋）を中心に、45度刻み（8方向）にタグの位置をオフセット可能。

リーダー線（シンボルとタグを繋ぐ線）は動的に長さを調節。

6. 実装データ構造 (TypeScript)

type NavMode = 'PROC' | 'VECTOR' | 'DIRECT';

interface AircraftState {
  id: string;
  callsign: string;
  mode: NavMode;
  pos: { lat: number; lon: number; alt: number };
  vector: { hdg: number; gs: number };
  
  // 管制承認ステータス
  isStarAuthorized: boolean;
  isApproachCleared: boolean;
  
  // 飛行計画と現在の目標
  flightPlan: string[]; // 経路上のFixリスト
  targetFix: string | null;
  targetAlt: number;
  targetHdg: number;
}


7. 物理・座標計算ロジック

更新レート: 1秒間に1回（またはそれ以上のフレームレート）。

旋回計算: 標準旋回（3度/秒）を適用。

高度変化: 一般的な上昇・降下率（1,500ft〜2,500ft/分）を適用。

DME/距離:


$$Distance = \sqrt{\Delta Lat^2 + (\Delta Lon \cdot \cos(Lat_{avg}))^2} \times 60$$

8. 拡張性 (Future Scalability)

ハンドオフ機能: 隣接管制区への移管処理。

気象影響: 風向・風速による対地速度（GS）と方位（Heading）の補正。

通信途絶（NORDO）: 自動で待機経路（Holding）へ向かうエマージェンシーロジック。