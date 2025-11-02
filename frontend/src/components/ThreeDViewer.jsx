// src/components/ThreeDViewer.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef, Suspense, useState, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Grid, TransformControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Cache commonly used geometries
const commonGeometries = {
  box: new THREE.BoxGeometry(),
  cylinder: new THREE.CylinderGeometry(),
  plane: new THREE.PlaneGeometry(),
};

/**
 * ThreeDViewer component for rendering 3D scenes
 * 
 * @param {Object} props
 * @param {Object} props.layout - Layout configuration { rooms: [ {name, size, x, y, rotation, scale} ] }
 * @param {string} [props.selectedRoomName] - Currently selected room name
 * @param {Function} [props.onSelectRoom] - Callback when a room is selected (name)
 * @param {Function} [props.onTransformEnd] - Callback after transformation (name, {x, y, rotationY, scale})
 * @param {('translate'|'rotate'|'scale')} [props.mode] - Current transform mode
 * @param {number} [props.snap] - Grid snap size in scene units
 * @param {boolean} [props.isEditMode] - Whether the room editor is active
 */

// Available furniture items for room editing
const FURNITURE_ITEMS = {
  living: ['Sofa', 'Coffee Table', 'TV Stand', 'Armchair', 'Rug'],
  bedroom: ['Bed', 'Wardrobe', 'Nightstand', 'Dresser'],
  kitchen: ['Kitchen Counter', 'Dining Table', 'Chair', 'Refrigerator'],
  bathroom: ['Bathtub', 'Sink', 'Toilet', 'Mirror'],
  office: ['Desk', 'Office Chair', 'Bookshelf', 'Filing Cabinet']
};

  // Modern luxury home exterior with sustainable features
  const DemoExteriorScene = () => {
    return (
      <>
        <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow={false} />
        
        {/* Landscaped ground */}
        <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={'#90a583'} />
        </mesh>

        {/* Modern house structure */}
        <group position={[0, 0, 0]}>
          {/* Ground floor - main volume */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[12, 3, 8]} />
            <meshStandardMaterial color={'#ffffff'} metalness={0.2} roughness={0.3} />
          </mesh>

          {/* Second floor - cantilevered volume */}
          <mesh position={[2, 4.5, 0]} castShadow>
            <boxGeometry args={[8, 3, 7]} />
            <meshStandardMaterial color={'#ffffff'} metalness={0.2} roughness={0.3} />
          </mesh>

          {/* Wooden accent panels */}
          <mesh position={[2, 4.5, 3.6]} castShadow>
            <boxGeometry args={[7.8, 2.8, 0.1]} />
            <meshStandardMaterial color={'#784421'} metalness={0.1} roughness={0.8} />
          </mesh>

          {/* Large glass windows - ground floor */}
          <group position={[0, 1.5, 4.1]}>
            <mesh>
              <boxGeometry args={[10, 2.5, 0.1]} />
              <meshPhysicalMaterial color={'#a5d6f1'} metalness={0.8} roughness={0.1} transparent opacity={0.3} />
            </mesh>
          </group>

          {/* Large glass windows - second floor */}
          <group position={[2, 4.5, 3.6]}>
            <mesh>
              <boxGeometry args={[7.8, 2.5, 0.1]} />
              <meshPhysicalMaterial color={'#a5d6f1'} metalness={0.8} roughness={0.1} transparent opacity={0.3} />
            </mesh>
          </group>

          {/* Modern entrance with overhang */}
          <group position={[4, 1.5, 4.1]}>
            <mesh castShadow>
              <boxGeometry args={[3, 0.2, 1.5]} />
              <meshStandardMaterial color={'#ffffff'} />
            </mesh>
            <mesh>
              <boxGeometry args={[2, 2.5, 0.1]} />
              <meshPhysicalMaterial color={'#2a2a2a'} metalness={0.5} roughness={0.5} />
            </mesh>
          </group>

          {/* Infinity pool */}
          <group position={[-4, 0.1, 2]}>
            <mesh receiveShadow>
              <boxGeometry args={[6, 0.2, 4]} />
              <meshPhysicalMaterial color={'#4fa4d4'} metalness={0.9} roughness={0.1} transparent opacity={0.7} />
            </mesh>
            {/* Pool deck */}
            <mesh position={[0, -0.1, 0]} receiveShadow>
              <boxGeometry args={[7, 0.1, 5]} />
              <meshStandardMaterial color={'#e0e0e0'} />
            </mesh>
          </group>
        </group>

        {/* Sustainable landscaping */}
        {/* Palm trees */}
        {[[-6, -2], [-4, 3], [6, -1], [4, 4]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            {/* Palm trunk */}
            <mesh position={[0, 2, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 4, 8]} />
              <meshStandardMaterial color={'#8b5e3c'} />
            </mesh>
            {/* Palm leaves */}
            <group position={[0, 4, 0]}>
              {Array.from({ length: 8 }).map((_, j) => (
                <mesh key={j} position={[0, 0, 0]} rotation={[0.3, (j * Math.PI) / 4, 0]} castShadow>
                  <boxGeometry args={[0.1, 2, 0.1]} />
                  <meshStandardMaterial color={'#2d5a27'} />
                </mesh>
              ))}
            </group>
          </group>
        ))}

        {/* Garden features */}
        {/* Native plants and rocks */}
        {[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshStandardMaterial color={'#2d5a27'} />
            </mesh>
            <mesh position={[0.5, 0.2, 0.3]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshStandardMaterial color={'#808080'} roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Modern pathway with lighting */}
        {Array.from({ length: 6 }).map((_, i) => (
          <group key={i} position={[3, 0.02, i * 2 - 4]}>
            <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
              <planeGeometry args={[2, 1]} />
              <meshStandardMaterial color={'#d0d0d0'} />
            </mesh>
            {/* Path lighting */}
            <mesh position={[0.8, 0.2, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
              <meshStandardMaterial color={'#ffeb3b'} emissive={'#ffeb3b'} emissiveIntensity={0.5} />
            </mesh>
          </group>
        ))}
      </>
    );
  };

  // Demo culture: Detailed Indian architectural elements
  const DemoCultureScene = () => {
    // Helper function to create intricate jali pattern
    const createJali = (x, y, z, width, height) => (
      <group position={[x, y, z]}>
        {/* Complex geometric jali pattern */}
        <mesh>
          <boxGeometry args={[width, height, 0.1]} />
          <meshStandardMaterial color="#e8c39e" />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={i}>
            {/* Horizontal lines */}
            <mesh position={[0, i * 0.12 - 0.42, 0.06]}>
              <boxGeometry args={[width, 0.03, 0.03]} />
              <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Vertical lines */}
            <mesh position={[i * 0.12 - 0.42, 0, 0.06]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[height, 0.03, 0.03]} />
              <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Diagonal ornaments */}
            {i < 7 && (
              <mesh position={[i * 0.12 - 0.36, i * 0.12 - 0.36, 0.06]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.15, 0.03, 0.03]} />
                <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    );

    // Helper function to create ornate arch
    const createArchway = (x, y, z, width, height) => (
      <group position={[x, y, z]}>
        {/* Main arch */}
        <mesh>
          <cylinderGeometry args={[width/2, width/2, 0.3, 32, 1, true, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#fbe7c6" />
        </mesh>
        {/* Decorative border */}
        <mesh position={[0, 0, 0.1]}>
          <cylinderGeometry args={[width/2 + 0.1, width/2 + 0.1, 0.1, 32, 1, true, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#d4af37" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    );

    return (
      <>
        <ambientLight intensity={0.7} />
  <directionalLight position={[5, 10, 7]} intensity={1.0} castShadow={false} />
        
        {/* Marble-textured base */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={'#f5e6d3'} />
        </mesh>

        {/* Traditional rangoli pattern */}
        {Array.from({ length: 12 }).map((_, i) => (
          Array.from({ length: 12 }).map((__, j) => (
            <mesh key={`${i}-${j}`} position={[i - 6, 0.01, j - 6]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[0.95, 0.95]} />
              <meshStandardMaterial color={((i + j) % 2 ? '#f9e076' : '#c14b2a')} />
            </mesh>
          ))
        ))}

        {/* Main haveli structure */}
        <group position={[0, 0, 0]}>
          {/* Ground floor */}
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[12, 4, 8]} />
            <meshStandardMaterial color={'#fbe7c6'} />
          </mesh>

          {/* First floor with jharokhas */}
          <mesh position={[0, 6, 0]} castShadow>
            <boxGeometry args={[12, 4, 8]} />
            <meshStandardMaterial color={'#fbe7c6'} />
          </mesh>

          {/* Central dome */}
          <group position={[0, 8, 0]}>
            {/* Main dome */}
            <mesh position={[0, 2, 0]} castShadow>
              <sphereGeometry args={[3, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={'#fbe7c6'} metalness={0.2} roughness={0.8} />
            </mesh>
            {/* Smaller domes */}
            {[-4, 4].map((x, i) => (
              <mesh key={i} position={[x, 1.5, 0]} castShadow>
                <sphereGeometry args={[1.5, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={'#fbe7c6'} metalness={0.2} roughness={0.8} />
              </mesh>
            ))}
          </group>

          {/* Kalash (finials) */}
          {[[-4, 9.5, 0], [0, 12, 0], [4, 9.5, 0]].map(([x, y, z], i) => (
            <group key={i} position={[x, y, z]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.15, 0.15, 1, 8]} />
                <meshStandardMaterial color={'#d4af37'} metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.6, 0]} castShadow>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshStandardMaterial color={'#d4af37'} metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          ))}

          {/* Ornate entrance */}
          <group position={[0, 2, 4.1]}>
            {createArchway(0, 0, 0, 3, 4)}
            <mesh position={[0, -2, 0]}>
              <boxGeometry args={[3, 4, 0.2]} />
              <meshStandardMaterial color={'#8b4513'} />
            </mesh>
          </group>

          {/* Jharokha windows */}
          {[-3, 0, 3].map((x, i) => (
            <group key={i}>
              {/* Ground floor jharokhas */}
              {createJali(x, 2, 4.1, 1.5, 1.5)}
              {/* First floor jharokhas */}
              {createJali(x, 6, 4.1, 1.5, 1.5)}
            </group>
          ))}

          {/* Ornate pillars */}
          {[[-5.9, -3.9], [-5.9, 3.9], [5.9, -3.9], [5.9, 3.9]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              {/* Base */}
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.4, 0.5, 1, 8]} />
                <meshStandardMaterial color={'#fbe7c6'} />
              </mesh>
              {/* Shaft with fluting */}
              <mesh position={[0, 4, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 7, 16]} />
                <meshStandardMaterial color={'#fbe7c6'} />
              </mesh>
              {/* Capital */}
              <mesh position={[0, 7.5, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.3, 1, 8]} />
                <meshStandardMaterial color={'#fbe7c6'} />
              </mesh>
              {/* Decorative bands */}
              {[2, 4, 6].map((y, j) => (
                <mesh key={j} position={[0, y, 0]} castShadow>
                  <torusGeometry args={[0.35, 0.05, 16, 32]} />
                  <meshStandardMaterial color={'#d4af37'} metalness={0.6} roughness={0.3} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* Courtyard elements */}
        {/* Water feature */}
        <mesh position={[0, 0.1, -6]} receiveShadow>
          <boxGeometry args={[4, 0.2, 4]} />
          <meshPhysicalMaterial color={'#4fa4d4'} metalness={0.9} roughness={0.1} transparent opacity={0.7} />
        </mesh>

        {/* Traditional planters with tulsi and other sacred plants */}
        {[-4, 4].map((x, i) => (
          <group key={i} position={[x, 0, -6]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.8, 0.8, 8]} />
              <meshStandardMaterial color={'#c14b2a'} />
            </mesh>
            <group position={[0, 0.8, 0]}>
              {/* Stylized sacred plants */}
              <mesh position={[0, 0.4, 0]} castShadow>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial color={'#1b5e20'} />
              </mesh>
              <mesh position={[0, 0.8, 0]} castShadow>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial color={'#2e7d32'} />
              </mesh>
            </group>
          </group>
        ))}
      </>
    );
  };

  // Schematic (simplified) versions of demo scenes for quick/blocky overview
  const DemoExteriorSchematic = () => (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={0.8} />
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={'#8a9b7a'} />
      </mesh>
      {/* Big block for house */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[12, 5, 8]} />
        <meshStandardMaterial color={'#cfcfcf'} />
      </mesh>
      {/* Pool block */}
      <mesh position={[-4, 0.1, 2]}>
        <boxGeometry args={[6, 0.2, 4]} />
        <meshStandardMaterial color={'#4fa4d4'} />
      </mesh>
      {/* Simplified trees */}
      {[[-6, -2], [6, -1], [4, 4]].map((p, i) => (
        <mesh key={i} position={[p[0], 1.2, p[1]]}>
          <cylinderGeometry args={[0.25, 0.25, 2.4, 8]} />
          <meshStandardMaterial color={'#7a4a2b'} />
        </mesh>
      ))}
    </>
  );

  const DemoCultureSchematic = () => (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={0.8} />
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={'#efe1cc'} />
      </mesh>
      {/* Big block for haveli */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[12, 8, 8]} />
        <meshStandardMaterial color={'#e9d7be'} />
      </mesh>
      {/* Dome simplified */}
      <mesh position={[0, 9, 0]}>
        <sphereGeometry args={[3, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#e9d7be'} />
      </mesh>
    </>
  );

const SceneInner = forwardRef(({ layout, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0, renderMode = "furnished", externalFurniture = {}, onRoomsReady = null }, ref) => {
  // --- glTF model support with optimized loading ---
  const sofaGltf = useMemo(() => {
    try {
      return useLoader(GLTFLoader, "/models/sofa.glb");
    } catch { return null; }
  }, []);
  
  const tvGltf = useMemo(() => {
    try {
      return useLoader(GLTFLoader, "/models/tv.glb");
    } catch { return null; }
  }, []);
  
  const toiletGltf = useMemo(() => {
    try {
      return useLoader(GLTFLoader, "/models/toilet.glb");
    } catch { return null; }
  }, []);
  
  const bedGltf = useMemo(() => {
    try {
      return useLoader(GLTFLoader, "/models/bed.glb");
    } catch { return null; }
  }, []);
  const { gl, scene, camera } = useThree();
  const transformRef = useRef();
  const groupRefs = useRef({}); // name -> group object3D

  // expose capture() up to outer ref
  useImperativeHandle(ref, () => ({
    capture: () => {
      try {
        // ensure a final render
        gl.render(scene, camera);
      } catch (e) {}
      return gl.domElement.toDataURL("image/png");
    },
  }), [gl, scene, camera]);

  // When selection changes or transformRef created, attach events to control
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    // objectChange fires continuously while transforming
    const onObjectChange = () => {
      // live updates not pushed here; we wait until interaction ends
    };

    // mouseUp indicates the user finished the transform
    const onMouseUp = () => {
      if (!selectedRoomName) return;
      const grp = groupRefs.current[selectedRoomName];
      if (!grp) return;
      // grp.position is center position; convert to top-left x,y in layout coordinate system:
      const roomDef = (layout.rooms || []).find((r) => r.name === selectedRoomName);
      const size = Number(roomDef?.size) || 3;
      // center -> top-left:
      const newX = Number((grp.position.x - size / 2).toFixed(3));
      const newY = Number((grp.position.z - size / 2).toFixed(3));
      const rotationY = Number((grp.rotation.y || 0).toFixed(5));
      const scale = Number((grp.scale.x || 1).toFixed(5));
      // optional snapping
      const snapTo = (v) => (snap ? Math.round(v / snap) * snap : v);
      onTransformEnd && onTransformEnd(selectedRoomName, {
        x: snapTo(newX),
        y: snapTo(newY),
        rotationY,
        scale,
      });
    };

    controls.addEventListener("objectChange", onObjectChange);
    controls.addEventListener("mouseUp", onMouseUp);

    return () => {
      controls.removeEventListener("objectChange", onObjectChange);
      controls.removeEventListener("mouseUp", onMouseUp);
    };
  }, [transformRef, selectedRoomName, layout, onTransformEnd, snap]);

  // Keep the group positions in sync with layout when layout changes externally
  useEffect(() => {
    (layout.rooms || []).forEach((r) => {
      const g = groupRefs.current[r.name];
      if (g) {
        const size = Number(r.size) || 3;
        g.position.set(Number(r.x) + size / 2, 0, Number(r.y) + size / 2);
        if (typeof r.rotationY !== "undefined") g.rotation.set(0, r.rotationY, 0);
        if (typeof r.scale !== "undefined") g.scale.set(r.scale, r.scale, r.scale);
      }
    });
    // notify parent about available rooms (for quick editor dropdown)
    try { onRoomsReady && onRoomsReady(Array.isArray(layout.rooms) ? layout.rooms.map(r => r.name) : []); } catch (e) {}
  }, [layout]);

  // --- simple procedural room interior prefabs (no external assets) ---
  const Sofa = ({ w = 1.6, d = 0.8, h = 0.6, color = '#6b3e26' }) => (
    <group>
      {/* base */}
      <mesh position={[0, h/2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* cushions */}
      <mesh position={[ -w*0.22, h*0.85, -d*0.15 ]}>
        <boxGeometry args={[w*0.4, h*0.3, d*0.6]} />
        <meshStandardMaterial color={'#a87a5a'} roughness={0.7} />
      </mesh>
      <mesh position={[ w*0.22, h*0.85, -d*0.15 ]}>
        <boxGeometry args={[w*0.4, h*0.3, d*0.6]} />
        <meshStandardMaterial color={'#a87a5a'} roughness={0.7} />
      </mesh>
    </group>
  );

  const TV = ({ w = 1.0, h = 0.6 }) => (
    <group>
      <mesh position={[0, h/2 + 0.2, -0.01]}> {/* slight offset from wall */}
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color="#111" metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0, h/2 + 0.05, -0.16]}> {/* screen */}
        <planeGeometry args={[w*0.92, h*0.6]} />
        <meshStandardMaterial color="#000" emissive="#060606" />
      </mesh>
    </group>
  );

  const Toilet = () => (
    <group>
      <mesh position={[0, 0.25, 0]}> <cylinderGeometry args={[0.22, 0.26, 0.45, 16]} /> <meshStandardMaterial color="#ffffff" /> </mesh>
      <mesh position={[0, 0.52, -0.08]}> <boxGeometry args={[0.34, 0.12, 0.18]} /> <meshStandardMaterial color="#ffffff" /> </mesh>
    </group>
  );

  const Bed = ({ w = 1.6, d = 2.0 }) => (
    <group>
      <mesh position={[0, 0.25, 0]}> <boxGeometry args={[w, 0.5, d]} /> <meshStandardMaterial color={'#cfa78a'} /></mesh>
      <mesh position={[0, 0.6, -d*0.15]}> <boxGeometry args={[w*0.8, 0.18, d*0.25]} /> <meshStandardMaterial color={'#e7d7c9'} /></mesh>
    </group>
  );

  // Small helper furniture: lamp, rug, basin
  const Lamp = ({ height = 1.2, color = '#ffdca3' }) => (
    <group>
      <mesh position={[0, height/2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, height, 12]} />
        <meshStandardMaterial color={'#5a3b2e'} />
      </mesh>
      <mesh position={[0, height - 0.15, 0]} castShadow>
        <coneGeometry args={[0.18, 0.3, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );

  const Rug = ({ w = 1.2, d = 1.6, color = '#d8cfc1' }) => (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );

  const Basin = ({ w = 0.5, h = 0.4 }) => (
    <group>
      <mesh position={[0, h/2, 0]} castShadow>
        <boxGeometry args={[w, h, 0.35]} />
        <meshStandardMaterial color={'#ffffff'} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
        <meshStandardMaterial color={'#e6e6e6'} metalness={0.2} roughness={0.15} />
      </mesh>
    </group>
  );

  function RoomInterior({ room, isSelected }){
    const size = Number(room.size) || 3;
    const half = size/2;
    // wall/floor dimensions that scale with room size for better visibility
    const wallHeight = 1.8;
    // increase minimum thickness so very small rooms don't end up as slats
    const wallThickness = Math.max(0.28, size * 0.045);
    const name = (room.name || '').toLowerCase();

    // basic floor + interior-lit walls using planes to avoid overlapping box intersections
    return (
      <group>
  {/* removed per-room dynamic lights to improve stability; use global lighting only */}

        {/* floor removed: interior BackSide box will provide the floor face to avoid overlapping geometry */}

        {/* Use an inset interior box rendered with BackSide so rooms are enclosed from inside without intersecting neighbor walls */}
        {(() => {
          const inset = Math.min(0.08, Math.max(0.02, size * 0.03));
          const innerSize = Math.max(0.2, size - inset * 2);
          return (
            <group>
              <mesh position={[0, wallHeight / 2 + 0.02, 0]} renderOrder={0} frustumCulled={false} castShadow={false} receiveShadow={false}>
                  <boxGeometry args={[innerSize, wallHeight, innerSize]} />
                  <meshStandardMaterial
                    color={'#f6f6f6'}
                    metalness={0.03}
                    roughness={0.6}
                    side={THREE.BackSide}
                    polygonOffset={true}
                    polygonOffsetFactor={2}
                    polygonOffsetUnits={2}
                    depthWrite={true}
                  />
                </mesh>
              {/* baseboards to hide seams between floor and interior box */}
              {(() => {
                const bbH = Math.min(0.08, wallHeight * 0.08);
                const bbT = Math.min(0.06, Math.max(0.02, innerSize * 0.02));
                const x = innerSize / 2 - bbT / 2;
                const z = innerSize / 2 - bbT / 2;
                return (
                  <group renderOrder={2} frustumCulled={false}>
                    {/* front/back */}
                    <mesh position={[0, bbH / 2, z]} castShadow={false} receiveShadow={false}>
                      <boxGeometry args={[innerSize + bbT * 2, bbH, bbT]} />
                      <meshStandardMaterial color={'#eeeeee'} roughness={0.7} polygonOffset={true} polygonOffsetFactor={1} polygonOffsetUnits={1} />
                    </mesh>
                    <mesh position={[0, bbH / 2, -z]} castShadow={false} receiveShadow={false}>
                      <boxGeometry args={[innerSize + bbT * 2, bbH, bbT]} />
                      <meshStandardMaterial color={'#eeeeee'} roughness={0.7} polygonOffset={true} polygonOffsetFactor={1} polygonOffsetUnits={1} />
                    </mesh>
                    {/* left/right */}
                    <mesh position={[x, bbH / 2, 0]} castShadow={false} receiveShadow={false}>
                      <boxGeometry args={[bbT, bbH, innerSize]} />
                      <meshStandardMaterial color={'#eeeeee'} roughness={0.7} polygonOffset={true} polygonOffsetFactor={1} polygonOffsetUnits={1} />
                    </mesh>
                    <mesh position={[-x, bbH / 2, 0]} castShadow={false} receiveShadow={false}>
                      <boxGeometry args={[bbT, bbH, innerSize]} />
                      <meshStandardMaterial color={'#eeeeee'} roughness={0.7} polygonOffset={true} polygonOffsetFactor={1} polygonOffsetUnits={1} />
                    </mesh>
                  </group>
                );
              })()}
            </group>
          );
        })()}

        {/* furniture based on room name heuristics, using glTF if available and renderMode is 'furnished' */}
        {renderMode === 'furnished' ? (
          (/bath|toilet|wc/).test(name) ? (
            <group position={[0, 0, 0.2]}>
              {toiletGltf ? <primitive object={toiletGltf.scene.clone()} scale={[0.7,0.7,0.7]} /> : <Toilet />}
              {/* small vanity basin & cabinet */}
              <group position={[ half - 0.7, 0.25, -0.2 ]}>
                <Basin />
                <mesh position={[0, 0.05, -0.18]}> <boxGeometry args={[0.6, 0.15, 0.18]} /> <meshStandardMaterial color={'#cfcfcf'} /></mesh>
              </group>
              {/* small bath mat */}
              <group position={[0, 0, 0.6]}> <Rug w={0.6} d={0.9} color={'#f3e9e2'} /> </group>
            </group>
          ) : (/living|lounge|living room|family/).test(name) ? (
            <group>
              {/* Modern L-shaped sofa */}
              <group position={[-half*0.3, 0, -half*0.2]}>
                <mesh position={[0, 0.25, 0]}> 
                  <boxGeometry args={[size*0.6, 0.4, size*0.4]} /> 
                  <meshStandardMaterial color={'#f5f5f5'} metalness={0.1} roughness={0.8} />
                </mesh>
                <mesh position={[size*0.3, 0.25, size*0.2]}> 
                  <boxGeometry args={[size*0.2, 0.4, size*0.4]} /> 
                  <meshStandardMaterial color={'#f5f5f5'} metalness={0.1} roughness={0.8} />
                </mesh>
              </group>
              
              {/* Wooden coffee table with marble top */}
              <group position={[0, 0, half*0.1]}>
                <mesh position={[0, 0.25, 0]}> 
                  <boxGeometry args={[size*0.4, 0.05, size*0.25]} /> 
                  <meshStandardMaterial color={'#ffffff'} metalness={0.3} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.15, 0]}>
                  <boxGeometry args={[size*0.35, 0.3, size*0.2]} />
                  <meshStandardMaterial color={'#8b5e3c'} metalness={0.1} roughness={0.8} />
                </mesh>
              </group>

              {/* rug under coffee table */}
              <group position={[0, 0, half*0.08]}> <Rug w={Math.max(1, size*0.6)} d={Math.max(0.8, size*0.45)} color={'#efe8df'} /> </group>

              {/* floor lamp in corner */}
              <group position={[ -half*0.8, 0, -half*0.7 ]}> <Lamp height={1.4} color={'#fff1d0'} /> </group>
              
              {/* Modern TV unit */}
              <group position={[half*0.5, 0.4, 0]}>
                <mesh position={[0, 0.4, 0]}>
                  {tvGltf ? <primitive object={tvGltf.scene.clone()} scale={[0.7,0.7,0.7]} /> : <TV w={Math.min(1.4, size*0.6)} h={Math.min(0.8, size*0.35)} />}
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[size*0.7, 0.1, size*0.2]} />
                  <meshStandardMaterial color={'#8b5e3c'} metalness={0.1} roughness={0.8} />
                </mesh>
              </group>
            </group>
          ) : (/master suite|master bedroom/).test(name) ? (
            <group>
              {/* Master bed */}
              <group position={[0, 0, -half*0.2]}>
                <mesh position={[0, 0.3, 0]}>
                  <boxGeometry args={[size*0.7, 0.4, size*0.5]} />
                  <meshStandardMaterial color={'#e0e0e0'} />
                </mesh>
                {/* Headboard */}
                <mesh position={[0, 0.8, -size*0.25]}>
                  <boxGeometry args={[size*0.7, 1, 0.1]} />
                  <meshStandardMaterial color={'#c5c5c5'} />
                </mesh>
                {/* Bedside tables */}
                <mesh position={[-size*0.4, 0.3, -size*0.2]}> <boxGeometry args={[0.4, 0.4, 0.4]} /> <meshStandardMaterial color={'#8b5e3c'} /> </mesh>
                <mesh position={[size*0.4, 0.3, -size*0.2]}> <boxGeometry args={[0.4, 0.4, 0.4]} /> <meshStandardMaterial color={'#8b5e3c'} /> </mesh>
                {/* bedside lamp and rug */}
                <group position={[-size*0.4, 0, -size*0.02]}> <Lamp height={0.9} color={'#ffeecc'} /> </group>
                <group position={[0, 0, size*0.18]}> <Rug w={size*0.6} d={size*0.5} color={'#efe1d6'} /> </group>
              </group>
              {/* Reading area */}
              <group position={[half*0.3, 0, half*0.3]}>
                <mesh position={[0, 0.25, 0]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
                  <meshStandardMaterial color={'#8b5e3c'} />
                </mesh>
                <mesh position={[0, 0.6, 0]}>
                  <sphereGeometry args={[0.4, 16, 16, 0, Math.PI]} />
                  <meshStandardMaterial color={'#f5f5f5'} />
                </mesh>
              </group>
            </group>
          ) : (/kitchen/).test(name) ? (
            <group>
              {/* Kitchen island with marble top */}
              <group position={[0, 0, 0]}>
                <mesh position={[0, 0.5, 0]}>
                  <boxGeometry args={[size*0.6, 0.05, size*0.4]} />
                  <meshStandardMaterial color={'#ffffff'} metalness={0.3} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                  <boxGeometry args={[size*0.58, 0.45, size*0.38]} />
                  <meshStandardMaterial color={'#2f2f2f'} />
                </mesh>
              </group>
              {/* Kitchen cabinets */}
              <group position={[0, 0, -half+0.3]}>
                {/* Lower cabinets */}
                <mesh position={[0, 0.3, 0]}>
                  <boxGeometry args={[size*0.9, 0.6, 0.6]} />
                  <meshStandardMaterial color={'#2f2f2f'} />
                </mesh>
                {/* Upper cabinets */}
                <mesh position={[0, 1.4, 0]}>
                  <boxGeometry args={[size*0.9, 0.8, 0.4]} />
                  <meshStandardMaterial color={'#2f2f2f'} />
                </mesh>
                {/* Countertop */}
                <mesh position={[0, 0.65, 0.1]}>
                  <boxGeometry args={[size*0.9, 0.05, 0.8]} />
                  <meshStandardMaterial color={'#ffffff'} metalness={0.3} roughness={0.2} />
                </mesh>
              </group>
            </group>
          ) : (
            /* generic furnished room */
            <group>
              <group position={[ -half*0.3, 0, -half*0.2 ]}>{sofaGltf ? <primitive object={sofaGltf.scene.clone()} scale={[0.5,0.5,0.5]} /> : <Sofa w={size*0.6} d={0.7} />}</group>
              <group position={[ half*0.5, 0.6, 0 ]}>{tvGltf ? <primitive object={tvGltf.scene.clone()} scale={[0.5,0.5,0.5]} /> : <TV w={Math.min(1.2, size*0.5)} h={0.6} />}</group>
              {/* generic rug */}
              <group position={[0, 0, 0.05]}> <Rug w={Math.max(0.8, size*0.6)} d={Math.max(0.8, size*0.5)} color={'#efe8df'} /> </group>
            </group>
          )
        ) : null}
      </group>
    );
  }

  return (
    <>
  {/* stronger scene ambient/hemisphere so interiors are visible */}
  <ambientLight intensity={0.75} />
  <hemisphereLight skyColor={"#bde0ff"} groundColor={"#444"} intensity={0.9} />
  <directionalLight position={[10, 15, 10]} intensity={0.9} castShadow={false} />
      <Grid args={[100, 100]} cellColor="#2b2b2b" sectionColor="#2b2b2b" position={[0, 0.001, 0]} />

      {/* Ground plane - make non-pickable so room meshes receive pointer events reliably */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#111" transparent opacity={0} />
      </mesh>

      {(layout.rooms || []).map((room) => {
        const size = Number(room.size) || 3;
        const centerX = Number(room.x) + size / 2;
        const centerZ = Number(room.y) + size / 2;
        const isSelected = selectedRoomName === room.name;

        // If selected, wrap the group in TransformControls so user can transform it
        // --- Schematic mode: original blue box ---
        const SchematicGroup = (
          <group
            key={room.name + "-schematic"}
            ref={(el) => (groupRefs.current[room.name] = el)}
            position={[centerX, 0, centerZ]}
          >
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[size, 1, size]} />
              <meshStandardMaterial color={isSelected ? "#ff8c42" : "#2aa3ff"} roughness={0.5} metalness={0.1} />
            </mesh>
            <Html position={[0, 1.05, 0]} center>
              <div style={{ color: "white", background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 6, fontSize: 12 }}>
                {room.name}
              </div>
            </Html>
          </group>
        );

        // --- Furnished mode: new interior ---
        const FurnishedGroup = (
          <group
              key={room.name + "-furnished"}
              ref={(el) => (groupRefs.current[room.name] = el)}
              position={[centerX, 0, centerZ]}
            >
              <group>
                <RoomInterior room={room} isSelected={isSelected} />

                {/* render externalFurniture placed via quick editor (non-destructive, simple placeholders) */}
                {(externalFurniture && externalFurniture[room.name] || []).map(f => (
                  <group key={f.id} position={f.position} rotation={f.rotation} scale={f.scale}>
                    <mesh position={[0, 0.15, 0]}>
                      <boxGeometry args={[Math.min(1, (room.size||3)/4), 0.3, Math.min(1, (room.size||3)/4)]} />
                      <meshStandardMaterial color={'#cfa78a'} />
                    </mesh>
                    <Html position={[0, 0.6, 0]} center>
                      <div style={{ background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{f.label}</div>
                    </Html>
                  </group>
                ))}
              </group>
              <Html position={[0, 1.9, 0]} center>
                <div style={{ color: "#3b2a20", background: "rgba(255,250,246,0.9)", padding: "6px 10px", borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  {room.name}
                </div>
              </Html>
            </group>
        );

        const GroupContents = renderMode === 'schematic' ? SchematicGroup : FurnishedGroup;

        return isSelected ? (
          <TransformControls
            key={room.name + "-tc"}
            ref={transformRef}
            mode={mode}
            showX
            showY
            showZ
            // disable pointer events propagation so OrbitControls doesn't fight
            onMouseDown={(e) => { e.stopPropagation(); }}
          >
            {GroupContents}
          </TransformControls>
        ) : (
          GroupContents
        );
      })}

      <OrbitControls />
    </>
  );
});

const ThreeDViewer = forwardRef(({ layout = { rooms: [] }, modelPath = null, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0, isEditMode = false, externalFurniture = {}, onRoomsReady = null }, ref) => {
  const innerRef = useRef();
  const canvasElRef = useRef(null); // holds the WebGL canvas DOM element
  const [previewImg, setPreviewImg] = useState(null);
  const [renderMode, setRenderMode] = useState('furnished');

  // forward capture
  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!innerRef.current) return null;
      return innerRef.current.capture();
    },
  }));
  // If a GLTF model path was provided, render that model in a focused viewer
  const isGLTF = typeof modelPath === 'string' && (modelPath.toLowerCase().endsWith('.glb') || modelPath.toLowerCase().endsWith('.gltf'));

    // Helper components for cultural integration
    const CulturalElement = ({ type, position, rotation = [0, 0, 0], scale = 1 }) => {
      const elements = {
        jali: (
          <mesh position={position} rotation={rotation} scale={scale}>
            <boxGeometry args={[1.5, 2, 0.1]} />
            <meshStandardMaterial color="#e8c39e" />
            {/* Jali pattern overlay */}
            <group position={[0, 0, 0.06]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <group key={i}>
                  <mesh position={[0, i * 0.3 - 0.75, 0]}>
                    <boxGeometry args={[1.5, 0.05, 0.05]} />
                    <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
                  </mesh>
                  <mesh position={[i * 0.3 - 0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <boxGeometry args={[2, 0.05, 0.05]} />
                    <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
                  </mesh>
                </group>
              ))}
            </group>
          </mesh>
        ),
        arch: (
          <group position={position} rotation={rotation} scale={scale}>
            <mesh>
              <cylinderGeometry args={[1.5, 1.5, 0.3, 32, 1, true, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#fbe7c6" />
            </mesh>
            <mesh position={[0, 0, 0.1]}>
              <cylinderGeometry args={[1.6, 1.6, 0.1, 32, 1, true, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#d4af37" metalness={0.4} roughness={0.6} />
            </mesh>
          </group>
        ),
        dome: (
          <group position={position} rotation={rotation} scale={scale}>
            <mesh>
              <sphereGeometry args={[1.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#fbe7c6" metalness={0.2} roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 2, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        ),
        pillar: (
          <group position={position} rotation={rotation} scale={scale}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.3, 0.4, 1, 8]} />
              <meshStandardMaterial color="#fbe7c6" />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <cylinderGeometry args={[0.25, 0.3, 3, 16]} />
              <meshStandardMaterial color="#fbe7c6" />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <cylinderGeometry args={[0.4, 0.25, 1, 8]} />
              <meshStandardMaterial color="#fbe7c6" />
            </mesh>
            {[1.5, 2.5, 3.5].map((y, i) => (
              <mesh key={i} position={[0, y, 0]}>
                <torusGeometry args={[0.3, 0.05, 16, 32]} />
                <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
              </mesh>
            ))}
          </group>
        )
      };
      return elements[type] || null;
    };

    // Enhanced model viewer with cultural integration
  const GLTFModel = ({ url, onModelCenter, renderMode = 'furnished' }) => {
    const gltf = useLoader(GLTFLoader, url);
    const refGroup = useRef();

    useEffect(() => {
      if (!gltf || !gltf.scene) return;
      // center & scale
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 4 / maxDim;
      gltf.scene.scale.multiplyScalar(scale);
      // notify parent of model center so controls can target it
      try { onModelCenter && onModelCenter(center); } catch (e) {}
    }, [gltf]);

    // prepare a schematic (wireframe/basic) clone if requested
    const schematicClone = React.useMemo(() => {
      if (!gltf || !gltf.scene) return null;
      const clone = gltf.scene.clone(true);
      clone.traverse((child) => {
        if (child.isMesh) {
          try {
            child.material = new THREE.MeshBasicMaterial({ color: '#bdbdbd', wireframe: true });
          } catch (e) {}
        }
      });
      return clone;
    }, [gltf]);

    // Add cultural elements around the model (omit in schematic for clarity)
    return (
      <group>
        {renderMode === 'schematic' && schematicClone ? (
          <primitive object={schematicClone} ref={refGroup} />
        ) : (
          <primitive object={gltf.scene} ref={refGroup} />
        )}

        {renderMode !== 'schematic' && (
          <>
            <CulturalElement type="jali" position={[-2, 1.5, 2]} />
            <CulturalElement type="jali" position={[2, 1.5, 2]} />
            <CulturalElement type="arch" position={[0, 2, 2]} scale={1.2} />
            <CulturalElement type="dome" position={[0, 4, 0]} scale={1.2} />
            <CulturalElement type="pillar" position={[-3, 0, 2]} />
            <CulturalElement type="pillar" position={[3, 0, 2]} />
          </>
        )}
      </group>
    );
  };

  // Demo interior layout based on the modern design showcase
  const demoLayout = {
    rooms: [
      // Modern Living Room with plants and contemporary furniture
      { name: 'Living Room', size: 5, x: 0, y: 0 },
      // Luxury Kitchen with marble countertops
      { name: 'Kitchen', size: 4.5, x: 5.5, y: 0 },
      // Master Suite with neutral tones
      { name: 'Master Suite', size: 4.5, x: 0, y: 5.5 }
    ]
  };

  // controls refs for GLTF and demo canvases
  const gltfControlsRef = useRef();
  const demoControlsRef = useRef();
  // model target for GLTF viewer (kept at top-level so hooks are unconditional)
  const [modelTarget, setModelTarget] = React.useState(new THREE.Vector3(0, 0, 0));

  if (isGLTF) {

    

    return (
      <div style={{ width: "100%", height: "70vh", borderRadius: 8, overflow: "hidden", background: "#000", position: 'relative' }}>
  {/* Room editor UI removed (non-invasive mode requested) */}
        {/* preview overlay */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
          <button className="btn-soft" onClick={() => {
            try {
              const canvas = canvasElRef.current;
              if (!canvas) return;
              const data = canvas.toDataURL('image/png');
              setPreviewImg(data);
            } catch (e) { console.warn(e); }
          }}>Preview 3D Image</button>
        </div>

        {/* Toggle button for schematic/furnished for GLTF model view */}
        <div style={{ position: 'absolute', top: 12, right: 18, zIndex: 10 }}>
          <button
            className={renderMode === 'furnished' ? 'btn-coffee' : 'btn-soft'}
            style={{ marginRight: 6 }}
            onClick={() => setRenderMode('furnished')}
          >
            Furnished
          </button>
          <button
            className={renderMode === 'schematic' ? 'btn-coffee' : 'btn-soft'}
            onClick={() => setRenderMode('schematic')}
          >
            Schematic
          </button>
        </div>

  <Canvas shadows={false} camera={{ position: [4, 3, 8], fov: 45 }} onCreated={({ gl }) => { canvasElRef.current = gl.domElement; }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <directionalLight position={[-5, 8, -7]} intensity={0.6} castShadow />
          {/* Ground plane with cultural patterns */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#e8c39e" />
          </mesh>
          <Suspense fallback={null}>
            <GLTFModel url={modelPath} onModelCenter={(c) => setModelTarget(c)} renderMode={renderMode} />
          </Suspense>
          <OrbitControls
            ref={gltfControlsRef}
            enablePan
            enableZoom
            enableRotate
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            minDistance={2}
            maxDistance={50}
          />
        </Canvas>

        {previewImg ? (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <img src={previewImg} alt="preview" style={{ width: 220, height: 'auto', display: 'block', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn-soft" onClick={() => setPreviewImg(null)}>Close</button>
                <a className="btn-coffee" href={previewImg} download="3d-preview.png">Download</a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // when modelTarget changes, update GLTF OrbitControls target and camera position (unconditional hook)
  useEffect(() => {
    if (!isGLTF) return;
    const ctr = gltfControlsRef.current;
    if (!ctr) return;
    try {
      ctr.target.copy(modelTarget);
      const cam = ctr.object;
      const offset = new THREE.Vector3(4, 3, 8);
      cam.position.copy(modelTarget.clone().add(offset));
      ctr.update();
    } catch (e) {}
  }, [isGLTF, modelTarget]);

  // ensure demo controls initially target the scene center (house center)
  useEffect(() => {
    const ctr = demoControlsRef.current;
    if (!ctr) return;
    try {
      ctr.target.set(0, 1, 0);
      ctr.update();
    } catch (e) {}
  }, []);

  // fallback: show the R3F scene inner (demo procedural rooms)
  return (
    <div style={{ width: "100%", height: "520px", borderRadius: 8, overflow: "hidden", background: "#111", position: 'relative' }}>
      {/* preview overlay for demo mode */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
        <button className="btn-soft" onClick={() => {
          try {
            const canvas = canvasElRef.current;
            if (!canvas) return;
            const data = canvas.toDataURL('image/png');
            setPreviewImg(data);
          } catch (e) { console.warn(e); }
        }}>Preview 3D Image</button>
      </div>
      {/* Toggle button for schematic/furnished */}
      <div style={{ position: 'absolute', top: 12, right: 18, zIndex: 10 }}>
        <button
          className={renderMode === 'furnished' ? 'btn-coffee' : 'btn-soft'}
          style={{ marginRight: 6 }}
          onClick={() => setRenderMode('furnished')}
        >
          Furnished
        </button>
        <button
          className={renderMode === 'schematic' ? 'btn-coffee' : 'btn-soft'}
          onClick={() => setRenderMode('schematic')}
        >
          Schematic
        </button>
      </div>
  <Canvas shadows={false} camera={{ position: [8, 6, 8], fov: 50 }} onCreated={({ gl }) => { canvasElRef.current = gl.domElement; }}>
        {typeof modelPath === 'string' && modelPath.startsWith('demo-exterior') ? (
          (renderMode === 'schematic') ? <DemoExteriorSchematic /> : <DemoExteriorScene />
        ) : typeof modelPath === 'string' && modelPath.startsWith('demo-culture') ? (
          (renderMode === 'schematic') ? <DemoCultureSchematic /> : <DemoCultureScene />
        ) : (
          <SceneInner ref={innerRef} layout={(typeof modelPath === 'string' && modelPath.startsWith('demo')) ? demoLayout : layout} selectedRoomName={selectedRoomName} onSelectRoom={onSelectRoom} onTransformEnd={onTransformEnd} mode={mode} snap={snap} renderMode={renderMode} externalFurniture={externalFurniture} onRoomsReady={(rooms) => { try { /* forward to parent if provided */ if (typeof onRoomsReady === 'function') onRoomsReady(rooms); } catch(e){} }} />
        )}
        {/* Add OrbitControls only for demo exterior/culture canvases so those scenes are rotatable; SceneInner manages its own controls */}
        {(typeof modelPath === 'string' && (modelPath.startsWith('demo-exterior') || modelPath.startsWith('demo-culture'))) && (
          <OrbitControls ref={demoControlsRef} enablePan enableZoom enableRotate minPolarAngle={0} maxPolarAngle={Math.PI} minDistance={3} maxDistance={100} />
        )}
      </Canvas>

      {previewImg ? (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img src={previewImg} alt="preview" style={{ width: 220, height: 'auto', display: 'block', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn-soft" onClick={() => setPreviewImg(null)}>Close</button>
              <a className="btn-coffee" href={previewImg} download="3d-preview.png">Download</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default ThreeDViewer;
