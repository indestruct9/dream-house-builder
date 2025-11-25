import React, { useMemo, useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Improved procedural furniture viewer. When real GLTF models aren't available,
// this renders distinct, colored primitives for each itemKey so the preview
// clearly matches the gallery selection (e.g. blue sofa, chair, table).
export default function SingleItemViewer({ itemKey = 'sofa', style = { width: '100%', height: 420 } }) {
  const key = (itemKey || 'unknown').toLowerCase();

  // Remote fallback URLs (Khronos glTF-Sample-Models raw files).
  // If you want additional/better models, change these to other model paths
  // or provide local files under `frontend/public/models/furniture/{key}.glb`.
  const remoteModelMap = useMemo(() => ({
    sofa: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb',
    chair: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb',
    lamp: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/StainedGlassLamp/glTF-Binary/StainedGlassLamp.glb',
    table: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CoffeeTable/glTF-Binary/CoffeeTable.glb',
    bed: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ReciprocatingSaw/glTF-Binary/ReciprocatingSaw.glb' // placeholder if bed missing; change as needed
  }), []);

  // Per-model transform overrides to correct orientation/scale/position
  const modelTransforms = useMemo(() => ({
    sofa: { scale: 1.0, rotation: [0, Math.PI * 0.5, 0], position: [0, 0, 0] },
    chair: { scale: 1.0, rotation: [0, Math.PI * 0.5, 0], position: [0, 0, 0] },
    lamp: { scale: 0.9, rotation: [0, Math.PI * 0.5, 0], position: [0, 0, 0] },
    table: { scale: 1.0, rotation: [0, Math.PI * 0.5, 0], position: [0, 0, 0] },
    bed: { scale: 0.9, rotation: [0, Math.PI * 0.5, 0], position: [0, 0, 0] }
  }), []);

  // Desired display heights (meters) per item key — used to auto-scale models
  const desiredHeights = useMemo(() => ({
    sofa: 0.9,
    armchair: 0.85,
    chair: 0.85,
    beanbag: 0.5,
    coffeetable: 0.45,
    sidetable: 0.5,
    bed: 0.9,
    nightstand: 0.5,
    rug: 0.02,
    painting: 0.6,
    plant: 0.7,
    tv: 0.6,
    lamp: 1.4,
    default: 0.8
  }), []);

  const fabricTexture = useMemo(() => {
    // small canvas-based fabric-like texture (subtle noise/stripes)
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    // base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    // light noise lines
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 18; i++) {
      const y = Math.floor((i + Math.random() * 0.5) * (size / 18));
      ctx.fillRect(0, y, size, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const Model = useMemo(() => {
    // Return a React component for the given key
    if (/sofa/.test(key)) {
      return function Sofa() {
        return (
          <group>
            {/* sofa base */}
            <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.6, 0.32, 0.86]} />
              <meshStandardMaterial map={fabricTexture} color={'#134e86'} metalness={0.02} roughness={0.6} />
            </mesh>
            {/* left cushion - rounded */}
            <mesh position={[-0.45, 0.44, 0.06]} castShadow>
              <sphereGeometry args={[0.32, 24, 16]} />
              <meshStandardMaterial map={fabricTexture} color={'#2b82d6'} roughness={0.65} />
            </mesh>
            {/* right cushion */}
            <mesh position={[0.45, 0.44, 0.06]} castShadow>
              <sphereGeometry args={[0.32, 24, 16]} />
              <meshStandardMaterial map={fabricTexture} color={'#2b82d6'} roughness={0.65} />
            </mesh>
            {/* back cushion */}
            <mesh position={[0, 0.65, -0.18]} castShadow>
              <boxGeometry args={[1.62, 0.28, 0.2]} />
              <meshStandardMaterial map={fabricTexture} color={'#2b82d6'} roughness={0.6} />
            </mesh>
            {/* armrests */}
            <mesh position={[-0.92, 0.35, 0]} rotation={[0, 0, Math.PI/14]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.9, 20]} />
              <meshStandardMaterial color={'#113a62'} roughness={0.6} metalness={0.05} />
            </mesh>
            <mesh position={[0.92, 0.35, 0]} rotation={[0, 0, -Math.PI/14]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.9, 20]} />
              <meshStandardMaterial color={'#113a62'} roughness={0.6} metalness={0.05} />
            </mesh>
            {/* legs */}
            {[-0.6, 0.6].map((x,i) => (
              <mesh key={i} position={[x, 0.02, -0.34]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
                <meshStandardMaterial color={'#2b2b2b'} metalness={0.7} roughness={0.35} />
              </mesh>
            ))}
            {/* small throw pillows */}
            <mesh position={[0, 0.54, 0.28]} rotation={[0, 0.1, 0]}>
              <sphereGeometry args={[0.12, 18, 12]} />
              <meshStandardMaterial color={'#ffd166'} roughness={0.7} />
            </mesh>
            <mesh position={[0.22, 0.52, 0.28]} rotation={[0, -0.1, 0]}>
              <sphereGeometry args={[0.12, 18, 12]} />
              <meshStandardMaterial color={'#ffb4a2'} roughness={0.7} />
            </mesh>
          </group>
        );
      };
    }

    if (/armchair|chair/.test(key)) {
      return function Chair() {
        return (
          <group>
            <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.46, 0.8]} />
              <meshStandardMaterial map={fabricTexture} color={'#2b82d6'} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.58, -0.18]} castShadow>
              <boxGeometry args={[0.8, 0.22, 0.22]} />
              <meshStandardMaterial map={fabricTexture} color={'#2b82d6'} roughness={0.6} />
            </mesh>
            {/* legs */}
            {[-0.25, 0.25].map((x,i) => (
              <mesh key={i} position={[x, 0.02, -0.28]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.06, 12]} />
                <meshStandardMaterial color={'#2b2b2b'} />
              </mesh>
            ))}
          </group>
        );
      };
    }

    if (/bed/.test(key)) {
      return function Bed() {
        return (
          <group>
            <mesh position={[0, 0.18, 0]}> <boxGeometry args={[1.8, 0.36, 2.0]} /> <meshStandardMaterial color={'#a67c52'} /></mesh>
            <mesh position={[0.25, 0.46, -0.4]}> <boxGeometry args={[0.9, 0.18, 0.6]} /> <meshStandardMaterial color={'#fff'} /></mesh>
            <mesh position={[-0.25, 0.46, -0.4]}> <boxGeometry args={[0.9, 0.18, 0.6]} /> <meshStandardMaterial color={'#fff'} /></mesh>
          </group>
        );
      };
    }

    if (/coffeetable|coffee|table/.test(key)) {
      return function CoffeeTable() {
        return (
          <group>
            <mesh position={[0, 0.18, 0]}> <cylinderGeometry args={[0.4, 0.4, 0.18, 32]} /> <meshStandardMaterial color={'#7b4e2f'} /></mesh>
            <mesh position={[0, 0.5, 0]}> <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} /> <meshStandardMaterial color={'#2b2b2b'} /></mesh>
          </group>
        );
      };
    }

    if (/nightstand/.test(key)) {
      return function Nightstand() {
        return (
          <group>
            <mesh position={[0, 0.2, 0]}> <boxGeometry args={[0.5, 0.4, 0.4]} /> <meshStandardMaterial color={'#8b5a3c'} /></mesh>
          </group>
        );
      };
    }

    if (/tv/.test(key)) {
      return function TV() {
        return (
          <group>
            <mesh position={[0, 0.55, 0]}> <boxGeometry args={[1.2, 0.7, 0.06]} /> <meshStandardMaterial color={'#050607'} metalness={0.2} /></mesh>
            <mesh position={[0, 0.2, 0.18]}> <boxGeometry args={[0.9, 0.12, 0.3]} /> <meshStandardMaterial color={'#3a2c21'} /></mesh>
          </group>
        );
      };
    }

    if (/rug/.test(key)) {
      return function Rug() {
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}> <planeGeometry args={[1.6, 1.8, 1, 1]} /> <meshStandardMaterial color={'#efe8df'} side={THREE.DoubleSide} /></mesh>
        );
      };
    }

    if (/painting/.test(key)) {
      return function Painting() {
        return (
          <mesh position={[0, 0.9, -0.95]}> <planeGeometry args={[0.9, 0.6]} /> <meshStandardMaterial color={'#f2c94c'} /></mesh>
        );
      };
    }

    if (/plant/.test(key)) {
      return function Plant() {
        return (
          <group>
            <mesh position={[0, 0.08, 0]}> <cylinderGeometry args={[0.16, 0.16, 0.18, 12]} /> <meshStandardMaterial color={'#8b4b2e'} /></mesh>
            <mesh position={[0, 0.42, 0]}> <sphereGeometry args={[0.26, 12, 8]} /> <meshStandardMaterial color={'#2f8b3b'} /></mesh>
          </group>
        );
      };
    }

    if (/lamp/.test(key)) {
      return function Lamp() {
        return (
          <group>
            <mesh position={[0, 0.5, 0]}> <cylinderGeometry args={[0.04, 0.04, 1.0, 12]} /> <meshStandardMaterial color={'#5a3b2e'} /></mesh>
            <mesh position={[0, 1.05, 0]}> <coneGeometry args={[0.18, 0.3, 16]} /> <meshStandardMaterial color={'#fff1c9'} emissive={'#fff1c9'} emissiveIntensity={0.6} /></mesh>
          </group>
        );
      };
    }

    // fallback simple recognizable placeholder
    return function Placeholder() {
      return (
        <mesh>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color={'#cfcfcf'} />
        </mesh>
      );
    };
  }, [key]);

  // Attempt to load a GLB model from /models/furniture/{key}.glb for real-looking items.
  const [gltf, setGltf] = useState(null);
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    setGltf(null);
    setLoadError(null);
    const url = `/models/furniture/${key}.glb`;
    let mounted = true;
    const loader = new GLTFLoader();
    // helper to apply transforms and shadow flags
    function prepareScene(res) {
      try {
        const t = modelTransforms[key] || { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] };
        // normalize materials and shadow properties
        res.scene.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
            // ensure textures show correctly in sRGB colorspace when present
            if (n.material) {
              // common fixes for GLB materials to look more PBR-accurate in our renderer
              if (n.material.map) {
                n.material.map.encoding = THREE.sRGBEncoding;
              }
              // set sensible defaults if values are missing
              if (typeof n.material.roughness === 'number') {
                n.material.roughness = Math.min(Math.max(n.material.roughness, 0.05), 1.0);
              } else {
                n.material.roughness = 0.6;
              }
              if (typeof n.material.metalness === 'number') {
                n.material.metalness = Math.min(Math.max(n.material.metalness, 0.0), 1.0);
              } else {
                n.material.metalness = 0.03;
              }
              // env map intensity helps reflections show under Environment
              if (typeof n.material.envMapIntensity === 'number') {
                n.material.envMapIntensity = Math.max(n.material.envMapIntensity, 0.8);
              } else {
                n.material.envMapIntensity = 1.0;
              }
              n.material.needsUpdate = true;
            }
          }
        });
        // Auto-scale and center the model to a sensible display size so it appears
        // correctly in the small preview room regardless of the author's unit scale.
        try {
          const bbox = new THREE.Box3().setFromObject(res.scene);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const currentHeight = size.y || size.z || size.x || 1;
          const desired = desiredHeights[key] || desiredHeights.default;
          // compute scale factor to match desired height
          const autoScale = (desired / currentHeight) * (t.scale || 1);
          res.scene.scale.set(autoScale, autoScale, autoScale);

          // center on origin and sit on the floor (y = 0)
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          // apply rotation first (if any)
          res.scene.rotation.set(...(t.rotation || [0, 0, 0]));
          // translate so center is at origin, then lower so minY lands at 0
          const newBBox = new THREE.Box3().setFromObject(res.scene);
          const min = new THREE.Vector3();
          newBBox.getSize(size);
          newBBox.getMin(min);
          // shift so object's center at (0,0,0)
          res.scene.position.set(-center.x * autoScale + (t.position ? t.position[0] : 0), -min.y * autoScale + (t.position ? t.position[1] : 0), -center.z * autoScale + (t.position ? t.position[2] : 0));
        } catch (e) {
          // fallback to explicit transforms if bbox math fails
          res.scene.scale.set(t.scale, t.scale, t.scale);
          res.scene.rotation.set(...t.rotation);
          res.scene.position.set(...t.position);
        }
      } catch (e) {}
    }

    // First try local path, then try remote mapping if local not present.
    loader.load(url, (res) => {
      if (!mounted) return;
      prepareScene(res);
      setGltf(res);
    }, undefined, (err) => {
      // local failed — try remote mapping
      const remote = remoteModelMap[key];
      if (remote) {
        loader.load(remote, (res2) => {
          if (!mounted) return;
          prepareScene(res2);
          setGltf(res2);
        }, undefined, (err2) => {
          if (!mounted) return;
          setLoadError(err2);
        });
      } else {
        if (!mounted) setLoadError(err);
      }
    });
    return () => { mounted = false; };
  }, [key]);

  return (
    <div style={style}>
      <Canvas
        camera={{ position: [2, 1.6, 2], fov: 50 }}
        shadows={true}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          // better PBR rendering defaults
          gl.physicallyCorrectLights = true;
          gl.outputEncoding = THREE.sRGBEncoding;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          // small scene tweak to allow PMREM from Environment to take effect
          scene.environment = scene.environment || null;
        }}
      >
        <color attach="background" args={[0xf7f7f7]} />
        <ambientLight intensity={0.6} />
        <directionalLight castShadow position={[2.5, 5, 2]} intensity={1.0} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0006} />
        <directionalLight position={[-2, 2.5, -1.5]} intensity={0.35} />
        <hemisphereLight skyColor={0xffffff} groundColor={0x888888} intensity={0.25} />
        {/* stronger environment for PBR highlights */}
        <Environment preset="studio" intensity={1.2} background={false} />

        {/* enclosed room (BackSide) */}
        <group>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.6, 1.9, 2.6]} />
            <meshStandardMaterial color={'#fafafa'} side={THREE.BackSide} />
          </mesh>

          {/* floor to catch shadows */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
            <planeGeometry args={[2.2, 2.2]} />
            <meshStandardMaterial color={'#efefef'} roughness={0.9} />
          </mesh>

          <group position={[0, 0, 0]}>
            {gltf ? (
              <primitive object={gltf.scene} dispose={null} />
            ) : (
              <Model />
            )}
          </group>

          {/* soft contact shadow for grounding */}
          <ContactShadows position={[0, 0, 0]} opacity={0.45} width={1.8} height={1.8} blur={3.5} far={0.6} />
        </group>

        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  );
}
