import * as THREE from 'three';

/**
 * ATC Simulator 3D Terrain Loader
 * QGIS実測値に基づき、RJOHを中心とした地形メッシュを生成する
 */ 
export const createTerrainMesh = async (verticalScale = 1.0) => { // verticalScaleを引数として追加
    const loader = new THREE.TextureLoader();

    // 1. 定数定義（QGIS実測値 & 物理定数）
    const TERRAIN_WIDTH_M = 183310.7; 
    const TERRAIN_HEIGHT_M = 147928.4;
    const METERS_PER_NM = 1852;
    const FEET_PER_NM = 6076.12;

    // QGISで確認した最大標高 (例: 大山付近を想定して1709m = 約5607ft)
    // ※ プロジェクトのQGISデータに合わせてこの数値を調整してください (5673ft = 約1729m)
    const MAX_ALT_M = 5500; 
    const MAX_ALT_FT = MAX_ALT_M * 3.28084;

    // 2. NM単位へのスケーリング (1ユニット = 1NM)
    const meshWidthNM = TERRAIN_WIDTH_M / METERS_PER_NM;
    const meshHeightNM = TERRAIN_HEIGHT_M / METERS_PER_NM;
    const meshMaxAltNM = MAX_ALT_FT / FEET_PER_NM;

    // 3. RJOH位置合わせ用オフセット (QGISでの実測値を入力)
    // 画像の「西端」および「北端」からRJOH(ARP)までの距離(NM)
    // これにより、RJOHが(0,0,0)に配置される (Three.jsのX軸は東、Z軸は南)
    const distFromWestEdgeNM = 61.3; // ※要確認: 西端からRJOHまでのNM
    const distFromNorthEdgeNM = 30.5; // ※要確認: 北端からRJOHまでのNM

    const offsetX = distFromWestEdgeNM - (meshWidthNM / 2);
    const offsetY = (meshHeightNM / 2) - distFromNorthEdgeNM;

    // 4. テクスチャの読み込み
    const loadTexture = (url) => loader.loadAsync(url).catch(err => {
        console.error(`Terrain Loader Error: Failed to load ${url}`);
        console.error(`Ensure that the 'terrain' folder is inside the 'public' directory.`);
        console.error(`Expected path: public${url.replace(/\//g, '\\')}`);
        throw err;
    });

    const [heightMap, satelliteMap] = await Promise.all([
        loadTexture('/terrain/heightmap.png'),
        loadTexture('/terrain/satellite.jpeg')
    ]);

    // 5. 地形メッシュ生成
    // セグメント数は地形の複雑さに応じて調整 (512x512程度が適当)
    const geometry = new THREE.PlaneGeometry(meshWidthNM, meshHeightNM, 512, 512);
    
    const material = new THREE.MeshStandardMaterial({
        map: satelliteMap,
        displacementMap: heightMap, 
        displacementScale: meshMaxAltNM * verticalScale, // verticalScaleを適用
        displacementBias: 0,
        roughness: 0.8,
        metalness: 0.2
    });

    // ピボットとなるグループを作成し、ワールド原点(0,0,0)に配置
    const pivotGroup = new THREE.Group();
    // pivotGroupはRJOHがワールド原点(0,0,0)になるように配置されるため、
    // ここでは位置を調整する必要はない。デフォルトの(0,0,0)で良い。

    const terrainMesh = new THREE.Mesh(geometry, material);

    // 6. 座標系の調整
    // Three.jsの標準ではPlaneはXY平面なので、床として扱うためにX軸を-90度回転
    terrainMesh.rotation.x = -Math.PI / 2;

    // 地形メッシュをpivotGroupの子として追加
    pivotGroup.add(terrainMesh);

    // terrainMeshを、RJOHがpivotGroupの原点(0,0,0)にくるように相対的に配置
    // terrainMeshのローカル原点(中心)からRJOHまでのオフセットの逆方向へ移動
    terrainMesh.position.set(-offsetX, 0, offsetY); // offsetXはX軸、offsetYはZ軸方向のオフセットとして使用

    // 磁気偏差を考慮して地図をY軸周りに回転 (8度反時計回り)
    // Three.jsのY軸は上方向。上から見て反時計回りは正の角度。
    pivotGroup.rotation.y = THREE.MathUtils.degToRad(-0.5);

    terrainMesh.name = "Terrain_Base";
    terrainMesh.receiveShadow = true;

    return { terrainGroup: pivotGroup, meshMaxAltNM: meshMaxAltNM }; // グループとmeshMaxAltNMを返す
};