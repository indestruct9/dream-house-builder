// src/components/ThreeDViewer.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, memo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * ThreeDViewer
 * Props:
 *  - layout: { rooms: [ {name, size, x, y, rotation? , scale? } ] }
 *  - selectedRoomName
 *  - onSelectRoom(name)
 *  - onTransformEnd(name, { x, y, rotationY, scale })
 *  - mode: "translate" | "rotate" | "scale"
 *  - snap: number (optional) - grid snap size in same units as x,y
 *
 * Exposes:
 *  - capture(): returns dataURL PNG of canvas via ref
 */

const SceneInner = forwardRef(({ layout, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0, shared = {} }, ref) => {
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
  }, [layout]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight skyColor={"#bde0ff"} groundColor={"#444"} intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <Grid args={[100, 100]} cellColor="#2b2b2b" sectionColor="#2b2b2b" position={[0, 0.001, 0]} />

      {/* Ground plane to receive pointer events if needed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#111" transparent opacity={0} />
      </mesh>

      {(layout.rooms || []).map((room) => {
        const size = Number(room.size) || 3;
        const centerX = Number(room.x) + size / 2;
        const centerZ = Number(room.y) + size / 2;
        const isSelected = selectedRoomName === room.name;

        // Procedural room model with furniture
        function RoomModel({ room, size, isSelected }) {
          // infer type from name
          const nameLower = (room.name || '').toLowerCase();
          let type = 'generic';
          if (nameLower.includes('living')) type = 'living';
          else if (nameLower.includes('bed')) type = 'bedroom';
          else if (nameLower.includes('kitchen')) type = 'kitchen';
          else if (nameLower.includes('bath')) type = 'bathroom';

          // Coffee palette
          const wallHeight = 2.4;
          const wallThickness = 0.14;
          const colorFloor = '#c2b280'; // coffee-cream
          const colorWall = '#7b5e57'; // coffee-brown

          return (
            <group>
              {/* floor */}
              <mesh rotation={[-Math.PI/2,0,0]} position={[0, 0.01, 0]} receiveShadow>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial color={colorFloor} roughness={0.95} />
              </mesh>

              {/* walls (tall, realistic) */}
              <mesh position={[0, wallHeight/2, -size/2 + wallThickness/2]}>
                <boxGeometry args={[size, wallHeight, wallThickness]} />
                <meshStandardMaterial color={colorWall} roughness={0.95} />
              </mesh>
              <mesh position={[0, wallHeight/2, size/2 - wallThickness/2]}>
                <boxGeometry args={[size, wallHeight, wallThickness]} />
                <meshStandardMaterial color={colorWall} roughness={0.95} />
              </mesh>
              <mesh position={[-size/2 + wallThickness/2, wallHeight/2, 0]}>
                <boxGeometry args={[wallThickness, wallHeight, size]} />
                <meshStandardMaterial color={colorWall} roughness={0.95} />
              </mesh>
              <mesh position={[size/2 - wallThickness/2, wallHeight/2, 0]}>
                <boxGeometry args={[wallThickness, wallHeight, size]} />
                <meshStandardMaterial color={colorWall} roughness={0.95} />
              </mesh>

              {/* Furnishing by type */}
              {type === 'living' && (
                <group>
                  {/* sofa */}
                  <mesh position={[ -size*0.15, 0.35, size*0.1 ]}>
                    <boxGeometry args={[size*0.5, 0.6, 0.9]} />
                    <primitive object={shared.darkMat} attach="material" />
                  </mesh>
                  {/* cushions */}
                  <mesh position={[ -size*0.02, 0.58, size*0.15 ]}>
                    <boxGeometry args={[size*0.2, 0.18, 0.3]} />
                    <primitive object={shared.lightMat} attach="material" />
                  </mesh>
                  {/* coffee table */}
                  <mesh position={[0.25, 0.2, 0]}>
                    <boxGeometry args={[0.7, 0.15, 0.5]} />
                    <primitive object={shared.accentMat} attach="material" />
                  </mesh>
                  {/* TV */}
                  <mesh position={[0, 0.65, -size*0.45]}>
                    <boxGeometry args={[size*0.6, 0.5, 0.05]} />
                    <primitive object={shared.darkMat} attach="material" />
                  </mesh>
                </group>
              )}

              {type === 'bedroom' && (
                <group>
                  {/* bed */}
                  <mesh position={[0, 0.35, 0]}>
                    <boxGeometry args={[size*0.8, 0.5, 0.9]} />
                    <primitive object={shared.darkMat} attach="material" />
                  </mesh>
                  <mesh position={[0, 0.68, -0.25]}>
                    <boxGeometry args={[0.6, 0.12, 0.3]} />
                    <primitive object={shared.lightMat} attach="material" />
                  </mesh>
                  {/* wardrobe */}
                  <mesh position={[size*0.35, 0.75, size*0.2]}>
                    <boxGeometry args={[0.6, 1.4, 0.5]} />
                    <primitive object={shared.accentMat} attach="material" />
                  </mesh>
                </group>
              )}

              {type === 'kitchen' && (
                <group>
                  {/* counter */}
                  <mesh position={[ -size*0.35, 0.3, 0 ]}>
                    <boxGeometry args={[size*0.6, 0.6, 0.6]} />
                    <primitive object={shared.accentMat} attach="material" />
                  </mesh>
                  {/* stove */}
                  <mesh position={[ -size*0.35, 0.65, -0.15 ]}>
                    <boxGeometry args={[0.25, 0.12, 0.25]} />
                    <primitive object={shared.darkMat} attach="material" />
                  </mesh>
                  {/* sink */}
                  <mesh position={[ -size*0.18, 0.68, 0.15 ]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
                    <primitive object={shared.lightMat} attach="material" />
                  </mesh>
                </group>
              )}

              {type === 'bathroom' && (
                <group>
                  {/* toilet */}
                  <mesh position={[-size*0.25, 0.22, -size*0.2]}>
                    <boxGeometry args={[0.28, 0.38, 0.38]} />
                    <primitive object={shared.lightMat} attach="material" />
                  </mesh>
                  {/* sink */}
                  <mesh position={[size*0.25, 0.25, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
                    <primitive object={shared.lightMat} attach="material" />
                  </mesh>
                </group>
              )}

              {/* label */}
              <Html position={[0, 1.05, 0]} center>
                <div style={{ color: "#2b1b12", background: "rgba(255,250,245,0.9)", padding: "6px 8px", borderRadius: 8, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  {room.name}
                </div>
              </Html>
            </group>
          );
        }

        // If selected, wrap the group in TransformControls so user can transform it
        const GroupContents = (
          <group
            key={room.name + "-group"}
            ref={(el) => (groupRefs.current[room.name] = el)}
            position={[centerX, 0, centerZ]}
          >
            <RoomModel room={room} size={size} isSelected={isSelected} />
          </group>
        );

        return isSelected ? (
          <TransformControls
            key={room.name}
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

const ThreeDViewer = forwardRef(({ layout = { rooms: [] }, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0 }, ref) => {
  const innerRef = useRef();

  // forward capture
  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!innerRef.current) return null;
      return innerRef.current.capture();
    },
  }));

  // shared materials/geometries for performance
  const shared = useMemo(() => {
    return {
      wallMat: new THREE.MeshStandardMaterial({ color: '#f7f2ee', roughness: 0.95 }),
      floorMat: new THREE.MeshStandardMaterial({ color: '#efe7da', roughness: 0.95 }),
      darkMat: new THREE.MeshStandardMaterial({ color: '#3a2b24', roughness: 0.8 }),
      lightMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
      accentMat: new THREE.MeshStandardMaterial({ color: '#8b5e45', roughness: 0.9 }),
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "520px", borderRadius: 8, overflow: "hidden", background: "#111" }}>
      <Canvas
        shadows
        camera={{ position: [10, 12, 10], fov: 50 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <SceneInner ref={innerRef} layout={layout} selectedRoomName={selectedRoomName} onSelectRoom={onSelectRoom} onTransformEnd={onTransformEnd} mode={mode} snap={snap} shared={shared} />
      </Canvas>
    </div>
  );
});

export default ThreeDViewer;
