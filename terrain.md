地形実装用システムプロンプト
【目的】
既存のRJOH中心の3D管制シミュレーション空間に、QGISで作成した地形（ハイトマップおよび衛星画像）を統合する。

【絶対条件：システム構造の維持】

座標系の維持: RJOH [133.234, 35.502] を(0,0,0)とし、1ユニット = 1NM（海里）とする既存の座標系を絶対とし、地形側をこれに合わせる。

物理スケールの一致: QGISでの実測値（横183310.7m / 縦147928.4m）を使用し、メートルからNMへの変換（1NM ≒ 1852m）を行って地形メッシュを生成する。

中心オフセットの適用: 画像の中心が原点にならないよう、画像内におけるRJOHの相対位置を計算し、地形メッシュを平行移動させて(0,0,0)に滑走路を配置する。

【技術スタック】

Three.js (既存の環境を想定)
MeshStandardMaterial (displacementMapを使用)

【実装ロジック詳細】
// 1. 定数定義（QGIS実測値）
const TERRAIN_WIDTH_M = 183310.7; 
const TERRAIN_HEIGHT_M = 147928.4;
const METERS_PER_NM = 1852;
const MAX_ALT_FT = [QGISで確認した最大標高] * 3.28084; // メートルをフィートに変換

// 2. NM単位へのスケーリング
const meshWidthNM = TERRAIN_WIDTH_M / METERS_PER_NM;
const meshHeightNM = TERRAIN_HEIGHT_M / METERS_PER_NM;
const meshMaxAltNM = MAX_ALT_FT / 6076.12; // フィートをNMに変換（垂直スケール用）

// 3. RJOH位置合わせ（画像端からのNM距離を計算して移動）
// ※QGISで測った「西端からRJOHまで」「北端からRJOHまで」の距離を使用
const offset_X = (西端からRJOHまでのNM距離) - (meshWidthNM / 2);
const offset_Y = (北端からRJOHまでのNM距離) - (meshHeightNM / 2);

// 4. 地形メッシュ生成
// PlaneGeometryを作成し、displacementMapにハイトマップを適用
// 平行移動(mesh.position.set)により、RJOHを(0,0,0)に一致させる


【出力リクエスト】
上記のロジックに基づき、既存の Scene クラスまたは初期化関数に追加する形式で、地形を読み込み・配置するJavaScriptコードを生成してください。特に、既存の航空機プロット（NM単位）が山の斜面や滑走路に対して正しい高度で表示されるよう、垂直方向のスケール調整（displacementScale）を精密に行ってください。

【画像データ】
terrainフォルダにheightmapとsatelliteが存在する