import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";

import { COUNTRIES, type Country } from "@/data/countries";
/** Lightweight university marker data — only what the globe needs for rendering. */
export interface UniversityMarkerData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  logo?: string;
}

const RADIUS = 2;
const BORDER_OFFSET = 0.015;
const FILL_OFFSET = 0.008;
const CAPITAL_OFFSET = 0.015;
const EARTH_TEXTURE = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const CLOUDS_TEXTURE = "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

const APPLE_RED = "#EF4444";
const HOVER_WHITE = "#ffffff";
const FILL_OPACITY_TARGET = 0.18;
const HOVER_BORDER_OPACITY = 0.82;
const SELECTED_BORDER_OPACITY = 0.95;
const HOVER_GLOW_OPACITY = 0.32;
const SELECTED_GLOW_OPACITY = 0.28;
const CAPITAL_COLOR = "#7DD3FC";

/* Travel status marker colors — green=not visited, yellow=wishlist, red=visited */
const MARKER_GREEN = new THREE.Color("#34C759");
const MARKER_YELLOW = new THREE.Color("#F59E0B");
const MARKER_RED = new THREE.Color("#EF4444");
const MARKER_OFFSET = 0.03;
const EMPTY_SET: Set<string> = new Set();

/* ------------------------------------------------------------------ */
/*  Camera zoom range (must match OrbitControls)                      */
/* ------------------------------------------------------------------ */

const MIN_DISTANCE = 2.3;
const MAX_DISTANCE = 12;
const BASE_ROTATION_SPEED = 0.55;

/* ------------------------------------------------------------------ */
/*  Coordinate helpers                                                 */
/* ------------------------------------------------------------------ */

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function vec3ToLatLng(pos: THREE.Vector3, radius: number): { lat: number; lng: number } {
  const y = THREE.MathUtils.clamp(pos.y / radius, -1, 1);
  const phi = Math.acos(y);
  const lat = 90 - (phi * 180) / Math.PI;
  const theta = Math.atan2(pos.z, -pos.x);
  let lng = (theta * 180) / Math.PI - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

function greatCircleDistDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const haversine =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 180) / Math.PI;
}

function findNearestCountry(lat: number, lng: number, maxDist: number = 28): Country | null {
  let nearest: Country | null = null;
  let minDist = Infinity;
  for (const c of COUNTRIES) {
    const dist = greatCircleDistDeg({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }
  return minDist < maxDist ? nearest : null;
}

/* ------------------------------------------------------------------ */
/*  Point-in-polygon (ray-casting) for border accuracy                 */
/* ------------------------------------------------------------------ */

function isPointInBorderPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];
    if ((lngi > lng) !== (lngj > lng) &&
        lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati) {
      inside = !inside;
    }
  }
  return inside;
}

function findCountryByPoint(lat: number, lng: number): Country | null {
  for (const c of COUNTRIES) {
    const dist = greatCircleDistDeg({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (dist > 40) continue;
    if (c.border && isPointInBorderPolygon(lat, lng, c.border)) {
      return c;
    }
  }
  return findNearestCountry(lat, lng, 16);
}

/* ------------------------------------------------------------------ */
/*  Geometry builders for country fill & border                        */
/* ------------------------------------------------------------------ */

function createCountryFillGeometry(
  border: [number, number][],
  radius: number,
): THREE.BufferGeometry {
  const pts3D = border.map(([lat, lng]) => latLngToVec3(lat, lng, radius));
  const centre = new THREE.Vector3();
  for (const p of pts3D) centre.add(p);
  centre.normalize().multiplyScalar(radius);

  const n = pts3D.length;
  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts3D[i];
    const p1 = pts3D[(i + 1) % n];
    positions.push(centre.x, centre.y, centre.z);
    positions.push(p0.x, p0.y, p0.z);
    positions.push(p1.x, p1.y, p1.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

function createCountryLineGeometry(
  border: [number, number][],
  radius: number,
): THREE.BufferGeometry {
  const pts3D = border.map(([lat, lng]) => latLngToVec3(lat, lng, radius));
  pts3D.push(pts3D[0].clone());
  return new THREE.BufferGeometry().setFromPoints(pts3D);
}

/* ------------------------------------------------------------------ */
/*  Capital markers — all capitals as a single points cloud            */
/* ------------------------------------------------------------------ */

function CapitalMarkers() {
  const points = useMemo(() => {
    const positions: number[] = [];
    for (const country of COUNTRIES) {
      const v = latLngToVec3(country.lat, country.lng, RADIUS + CAPITAL_OFFSET);
      positions.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    const mat = new THREE.PointsMaterial({
      color: CAPITAL_COLOR,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const obj = new THREE.Points(geo, mat);
    obj.renderOrder = 2;
    obj.raycast = () => {};
    return obj;
  }, []);

  return <primitive object={points} />;
}

/* ------------------------------------------------------------------ */
/*  Status markers — InstancedMesh version (2 draw calls for all)      */
/*  Green = not visited, Yellow = wishlist, Red = visited              */
/* ------------------------------------------------------------------ */

const MAX_STATUS_INSTANCES = 300;

function StatusMarkers({
  visitedIds,
  wishlistIds,
  onMarkerClick,
}: {
  visitedIds: Set<string>;
  wishlistIds: Set<string>;
  onMarkerClick: (country: Country) => void;
}) {
  const { camera } = useThree();
  const dotMeshRef = useRef<THREE.InstancedMesh>(null);
  const haloMeshRef = useRef<THREE.InstancedMesh>(null);
  const lastCamPos = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  const needsUpdate = useRef(true);

  const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // Precompute marker positions + directions
  const markerData = useMemo(() => {
    return COUNTRIES.map((country) => {
      const pos = latLngToVec3(country.lat, country.lng, RADIUS + MARKER_OFFSET);
      const dir = pos.clone().normalize();
      return { country, pos, dir };
    });
  }, []);

  useEffect(() => {
    needsUpdate.current = true;
  }, [visitedIds, wishlistIds]);

  useFrame(() => {
    const dotMesh = dotMeshRef.current;
    const haloMesh = haloMeshRef.current;
    if (!dotMesh || !haloMesh) return;

    const camMoved = camera.position.distanceToSquared(lastCamPos.current) > 0.0004;
    if (camMoved) lastCamPos.current.copy(camera.position);

    // Recluster on camera move or color change
    if (camMoved || needsUpdate.current) {
      const camDir = camera.position.clone().normalize();
      let visibleCount = 0;

      for (let i = 0; i < markerData.length && visibleCount < MAX_STATUS_INSTANCES; i++) {
        const md = markerData[i];
        const dot = md.dir.x * camDir.x + md.dir.y * camDir.y + md.dir.z * camDir.z;
        if (dot < -0.05) continue;

        const col = visitedIds.has(md.country.id)
          ? MARKER_RED
          : wishlistIds.has(md.country.id)
            ? MARKER_YELLOW
            : MARKER_GREEN;

        tmpScale.setScalar(1);
        tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
        dotMesh.setMatrixAt(visibleCount, tmpMatrix);
        dotMesh.setColorAt(visibleCount, col);

        tmpScale.setScalar(1);
        tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
        haloMesh.setMatrixAt(visibleCount, tmpMatrix);
        haloMesh.setColorAt(visibleCount, col);

        // Store country index in userData via instanceId mapping
        (dotMesh as any)._countryMap = (dotMesh as any)._countryMap || new Int32Array(MAX_STATUS_INSTANCES).fill(-1);
        (dotMesh as any)._countryMap[visibleCount] = i;

        visibleCount++;
      }

      // Hide unused
      tmpScale.setScalar(0);
      tmpMatrix.compose(new THREE.Vector3(0, 0, 0), tmpQuat, tmpScale);
      const prevCount = Math.max(dotMesh.count, visibleCount);
      for (let v = visibleCount; v < prevCount; v++) {
        dotMesh.setMatrixAt(v, tmpMatrix);
        haloMesh.setMatrixAt(v, tmpMatrix);
      }

      dotMesh.instanceMatrix.needsUpdate = true;
      haloMesh.instanceMatrix.needsUpdate = true;
      if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
      if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;
      dotMesh.count = visibleCount;
      haloMesh.count = visibleCount;
      needsUpdate.current = false;
    }

    // Pulse halos — every frame, visible only
    const count = haloMesh.count;
    const t = Date.now() * 0.003;
    for (let v = 0; v < count; v++) {
      const countryMap = (haloMesh as any)._countryMap as Int32Array | undefined;
      const i = countryMap ? countryMap[v] : v;
      const md = markerData[i];
      if (!md) continue;
      const phase = t + i * 0.15;
      const pulseScale = 1 + Math.sin(phase) * 0.25;

      tmpScale.setScalar(pulseScale);
      tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
      haloMesh.setMatrixAt(v, tmpMatrix);

      const col = visitedIds.has(md.country.id)
        ? MARKER_RED
        : wishlistIds.has(md.country.id)
          ? MARKER_YELLOW
          : MARKER_GREEN;
      const brightness = 0.25 + Math.sin(phase) * 0.15;
      tmpColor.copy(col).multiplyScalar(brightness);
      haloMesh.setColorAt(v, tmpColor);
    }
    haloMesh.instanceMatrix.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const instanceId = e.instanceId;
      if (instanceId === undefined || instanceId < 0) return;
      const countryMap = (dotMeshRef.current as any)?._countryMap as Int32Array | undefined;
      if (!countryMap) return;
      const idx = countryMap[instanceId];
      if (idx < 0 || idx >= markerData.length) return;
      onMarkerClick(markerData[idx].country);
    },
    [onMarkerClick, markerData],
  );

  return (
    <group>
      <instancedMesh
        ref={haloMeshRef}
        args={[undefined as any, undefined as any, MAX_STATUS_INSTANCES]}
        raycast={() => {}}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.3} depthTest depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
      <instancedMesh
        ref={dotMeshRef}
        args={[undefined as any, undefined as any, MAX_STATUS_INSTANCES]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.9} depthTest />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  University markers with zoom-based clustering                      */
/*  When zoomed out, nearby universities are clustered into groups.    */
/*  As the user zooms in, clusters split into individual universities.  */
/* ------------------------------------------------------------------ */

const UNI_MARKER_OFFSET = 0.025;
const UNI_MARKER_YELLOW = new THREE.Color("#7DD3FC");
const UNI_MARKER_GOLD = new THREE.Color("#3B82F6");
const UNI_MARKER_GREEN = new THREE.Color("#34C759");
const UNI_MARKER_RED = new THREE.Color("#EF4444");
const MAX_UNI_INSTANCES = 3000;

interface UniMarkerData {
  id: string;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  lat: number;
  lng: number;
}

function UniversityClusterMarkers({
  universities,
  selectedId,
  wishlistIds,
  visitedIds,
  onMarkerClick,
  interactionEnabled,
  controlsRef,
  reducedAnimation,
}: {
  universities: UniversityMarkerData[];
  selectedId: string | null;
  wishlistIds: Set<string>;
  visitedIds: Set<string>;
  onMarkerClick: (uniId: string) => void;
  interactionEnabled: boolean;
  controlsRef: React.RefObject<any>;
  reducedAnimation?: boolean;
}) {
  const { camera } = useThree();
  const dotMeshRef = useRef<THREE.InstancedMesh>(null);
  const haloMeshRef = useRef<THREE.InstancedMesh>(null);
  // Initialize with -1 so unset slots are distinguishable from valid index 0
  const visibleMapRef = useRef<Int32Array>(new Int32Array(MAX_UNI_INSTANCES).fill(-1));
  const lastCamPos = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  const needsColorUpdate = useRef(true);
  const frameCount = useRef(0);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // Reusable temp objects (avoid per-frame allocations)
  const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  // Precompute marker positions + normalized directions
  const markerData = useMemo<UniMarkerData[]>(() => {
    return universities.map((uni) => {
      const pos = latLngToVec3(uni.latitude, uni.longitude, RADIUS + UNI_MARKER_OFFSET);
      const dir = pos.clone().normalize();
      return { id: uni.id, pos, dir, lat: uni.latitude, lng: uni.longitude };
    });
  }, [universities]);

  // Trigger refresh when travel status or university list changes (e.g. filters applied)
  useEffect(() => {
    needsColorUpdate.current = true;
    // Reset visible map when universities array changes to prevent stale indices
    visibleMapRef.current.fill(-1);
  }, [visitedIds, wishlistIds, selectedId, universities]);

  // Pause pulse animation when reducedAnimation is true (modal open, tab hidden)
  const reducedAnimationRef = useRef(false);
  reducedAnimationRef.current = reducedAnimation;

  useFrame(() => {
    const dotMesh = dotMeshRef.current;
    const haloMesh = haloMeshRef.current;
    if (!dotMesh || !haloMesh || !controlsRef.current) return;

    const ctrl = controlsRef.current;
    const dist = camera.position.distanceTo(ctrl.target);
    const zoomLevel = THREE.MathUtils.clamp(
      (MAX_DISTANCE - dist) / (MAX_DISTANCE - MIN_DISTANCE),
      0,
      1,
    );

    // Throttle: only recluster when camera moved or colors changed
    const camMoved = camera.position.distanceToSquared(lastCamPos.current) > 0.0004;
    const needsRecluster = camMoved || needsColorUpdate.current;
    if (camMoved) lastCamPos.current.copy(camera.position);

    // Camera direction (from globe center to camera, normalized)
    camDir.copy(camera.position).normalize();

    if (needsRecluster) {
      // Cluster threshold in degrees — shrinks as user zooms in
      const clusterThreshold = THREE.MathUtils.lerp(20, 1.5, zoomLevel);
      const cullThreshold = -0.05; // show slightly more than a hemisphere

      // O(n) grid clustering: numeric key = cellLat * 10000 + cellLng
      const grid = new Map<number, number>();
      let visibleCount = 0;
      const markerCount = markerData.length;

      // Clear the map before reclustering so stale indices don't cause wrong lookups
      visibleMapRef.current.fill(-1);

      for (let i = 0; i < markerCount && visibleCount < MAX_UNI_INSTANCES; i++) {
        const md = markerData[i];

        // Viewport cull: skip markers on the far side of the globe
        const dot = md.dir.x * camDir.x + md.dir.y * camDir.y + md.dir.z * camDir.z;
        if (dot < cullThreshold) continue;

        // Grid clustering: only show one marker per cell
        const cellLat = Math.floor(md.lat / clusterThreshold);
        const cellLng = Math.floor(md.lng / clusterThreshold);
        const cellKey = cellLat * 10000 + cellLng;

        const isSelected = md.id === selectedId;
        if (!isSelected && grid.has(cellKey)) continue;

        grid.set(cellKey, visibleCount);
        visibleMapRef.current[visibleCount] = i;
        visibleCount++;
      }

      // Update dot instance matrices + colors
      for (let v = 0; v < visibleCount; v++) {
        const i = visibleMapRef.current[v];
        const md = markerData[i];
        if (!md) continue;
        const isSelected = md.id === selectedId;
        const baseColor = isSelected
          ? UNI_MARKER_GOLD
          : visitedIds.has(md.id)
            ? UNI_MARKER_GREEN
            : wishlistIds.has(md.id)
              ? UNI_MARKER_GOLD
              : UNI_MARKER_YELLOW;

        // Dot: fixed scale, full color
        tmpScale.setScalar(1);
        tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
        dotMesh.setMatrixAt(v, tmpMatrix);
        dotMesh.setColorAt(v, baseColor);

        // Halo: base scale (pulse applied below)
        tmpScale.setScalar(1);
        tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
        haloMesh.setMatrixAt(v, tmpMatrix);
        haloMesh.setColorAt(v, baseColor);
      }

      // Hide unused instances by scaling to 0
      tmpScale.setScalar(0);
      tmpPos.set(0, 0, 0);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      const prevCount = Math.max(dotMesh.count, visibleCount);
      for (let v = visibleCount; v < prevCount; v++) {
        dotMesh.setMatrixAt(v, tmpMatrix);
        haloMesh.setMatrixAt(v, tmpMatrix);
      }

      dotMesh.instanceMatrix.needsUpdate = true;
      haloMesh.instanceMatrix.needsUpdate = true;
      if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
      if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;

      dotMesh.count = visibleCount;
      haloMesh.count = visibleCount;
      needsColorUpdate.current = false;
    }

    // Pulse animation for halos — skip when reducedAnimation is active
    frameCount.current++;
    const shouldPulse = !reducedAnimationRef.current && frameCount.current % 2 === 0;
    const count = dotMesh.count;
    if (shouldPulse) {
      const t = Date.now() * 0.003;
      for (let v = 0; v < count; v++) {
        const i = visibleMapRef.current[v];
        if (i < 0) continue;
        const md = markerData[i];
        if (!md) continue;
        const isSelected = md.id === selectedId;
        const phase = isSelected ? Date.now() * 0.006 : t + i * 0.15;
        const baseScale = isSelected ? 1.5 : 1;
        const amp = isSelected ? 0.35 : 0.25;
        const pulseScale = baseScale + Math.sin(phase) * amp;

        tmpScale.setScalar(pulseScale);
        tmpMatrix.compose(md.pos, tmpQuat, tmpScale);
        haloMesh.setMatrixAt(v, tmpMatrix);

        const brightness = isSelected
          ? 0.4 + Math.sin(phase) * 0.2
          : 0.25 + Math.sin(phase) * 0.15;
        const baseColor = isSelected
          ? UNI_MARKER_GOLD
          : visitedIds.has(md.id)
            ? UNI_MARKER_GREEN
            : wishlistIds.has(md.id)
              ? UNI_MARKER_GOLD
              : UNI_MARKER_YELLOW;
        tmpColor.copy(baseColor).multiplyScalar(brightness);
        haloMesh.setColorAt(v, tmpColor);
      }
      haloMesh.instanceMatrix.needsUpdate = true;
      if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;
    }
  });

  // Pointer down — record start position for drag-vs-click threshold
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  }, []);

  // Raycast → instanceId → university ID lookup.
  // Drag threshold prevents marker click when user was rotating the globe.
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!interactionEnabled) return;

      // Drag threshold — don't fire if pointer moved more than 6px
      if (pointerDownPos.current) {
        const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
        const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
        pointerDownPos.current = null;
        if (Math.sqrt(dx * dx + dy * dy) > 6) return;
      }

      const instanceId = e.instanceId;
      if (instanceId === undefined || instanceId < 0) return;
      const uniIdx = visibleMapRef.current[instanceId];
      if (uniIdx < 0 || uniIdx >= markerData.length) return;
      const md = markerData[uniIdx];
      if (!md || !md.id) return;
      onMarkerClick(md.id);
    },
    [interactionEnabled, onMarkerClick, markerData],
  );

  return (
    <group>
      {/* Halo layer — additive blended, raycast disabled */}
      <instancedMesh
        ref={haloMeshRef}
        args={[undefined as any, undefined as any, MAX_UNI_INSTANCES]}
        raycast={() => {}}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshBasicMaterial
          transparent
          opacity={0.3}
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Dot layer — clickable, per-instance color */}
      <instancedMesh
        ref={dotMeshRef}
        args={[undefined as any, undefined as any, MAX_UNI_INSTANCES]}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onPointerOver={() => { if (interactionEnabled) document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.020, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={0.9}
          depthTest
        />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Country highlight — fill + border + glow                           */
/*                                                                     */
/*  Hover:  white border + white additive glow, no fill                */
/*  Select: red border + red additive glow + semi-transparent red fill */
/* ------------------------------------------------------------------ */

function CountryHighlight({
  country,
  isSelected,
  isHovered,
}: {
  country: Country;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const border = country.border;
  if (!border || border.length < 3) return null;

  const fillRadius = RADIUS + FILL_OFFSET;
  const lineRadius = RADIUS + BORDER_OFFSET;

  const fillGeo = useMemo(() => createCountryFillGeometry(border, fillRadius), [border, fillRadius]);
  const lineGeo = useMemo(() => createCountryLineGeometry(border, lineRadius), [border, lineRadius]);

  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: APPLE_RED,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const borderColor = isSelected ? APPLE_RED : HOVER_WHITE;
  const borderMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
      }),
    [borderColor],
  );

  const glowColor = isSelected ? APPLE_RED : HOVER_WHITE;
  const glowMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [glowColor],
  );

  const fillMesh = useMemo(() => new THREE.Mesh(fillGeo, fillMat), [fillGeo, fillMat]);
  const borderLine = useMemo(() => new THREE.Line(lineGeo, borderMat), [lineGeo, borderMat]);
  const glowLine = useMemo(() => new THREE.Line(lineGeo, glowMat), [lineGeo, glowMat]);

  useMemo(() => {
    fillMesh.renderOrder = 3;
    borderLine.renderOrder = 4;
    glowLine.renderOrder = 4;
  }, [fillMesh, borderLine, glowLine]);

  const targetFillOpacity = isSelected ? FILL_OPACITY_TARGET : 0;
  const targetBorderOpacity = isSelected
    ? SELECTED_BORDER_OPACITY
    : isHovered
      ? HOVER_BORDER_OPACITY
      : 0;
  const targetGlowOpacity = isSelected
    ? SELECTED_GLOW_OPACITY
    : isHovered
      ? HOVER_GLOW_OPACITY
      : 0;

  useFrame((_, delta) => {
    const speed = isHovered && !isSelected ? 16 : 11;
    fillMat.opacity += (targetFillOpacity - fillMat.opacity) * Math.min(delta * speed, 1);
    borderMat.opacity += (targetBorderOpacity - borderMat.opacity) * Math.min(delta * speed, 1);
    glowMat.opacity += (targetGlowOpacity - glowMat.opacity) * Math.min(delta * speed, 1);
  });

  const showBorder = isSelected || isHovered;

  return (
    <group>
      {showBorder && <primitive object={glowLine} />}
      {showBorder && <primitive object={borderLine} />}
      {isSelected && <primitive object={fillMesh} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic clouds layer — slowly rotating, semi-transparent            */
/* ------------------------------------------------------------------ */

function CloudsLayer({ reducedAnimation }: { reducedAnimation?: boolean }) {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(CLOUDS_TEXTURE);

  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useFrame((_, delta) => {
    if (cloudsRef.current && !reducedAnimation) {
      cloudsRef.current.rotation.y += delta * 0.018;
    }
  });

  return (
    <mesh ref={cloudsRef} scale={1.01}>
      <sphereGeometry args={[RADIUS, 32, 32]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.35}
        depthTest
        depthWrite={false}
        blending={THREE.NormalBlending}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Day/night cycle — animated directional light orbiting the globe     */
/* ------------------------------------------------------------------ */

function DayNightCycle({ reducedAnimation }: { reducedAnimation?: boolean }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame((state) => {
    if (reducedAnimation) return;
    const t = state.clock.getElapsedTime() * 0.08;
    if (lightRef.current) {
      lightRef.current.position.set(
        Math.cos(t) * 8,
        Math.sin(t * 0.4) * 3,
        Math.sin(t) * 8,
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.55} />
      <directionalLight ref={lightRef} intensity={1.8} color="#fff8e7" />
      <directionalLight position={[-3, -1, -5]} intensity={0.5} color="#88bbff" />
      <directionalLight position={[0, -5, 0]} intensity={0.3} color="#225588" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Earth sphere with interactions                                     */
/* ------------------------------------------------------------------ */

function EarthSphere({
  onCountrySelect,
  onCountryDoubleClick,
  onBackgroundTap,
  selectedCountry,
  hoveredCountry,
  onHoverCountry,
  universityMode,
}: {
  onCountrySelect: (c: Country) => void;
  onCountryDoubleClick: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  hoveredCountry: Country | null;
  onHoverCountry: (c: Country | null) => void;
  /** When true, disables expensive hover detection and simplifies click handling for performance. */
  universityMode?: boolean;
}) {
  const texture = useTexture(EARTH_TEXTURE);
  const meshRef = useRef<THREE.Mesh>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastClickTime = useRef<number>(0);
  const lastClickCountry = useRef<Country | null>(null);

  useMemo(() => {
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
  }, [texture]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (universityMode) return; // skip expensive findCountryByPoint in university mode
      e.stopPropagation();
      const point = e.point.clone();
      if (meshRef.current) meshRef.current.worldToLocal(point);
      const { lat, lng } = vec3ToLatLng(point, RADIUS);
      const country = findCountryByPoint(lat, lng);
      onHoverCountry(country);
    },
    [onHoverCountry, universityMode],
  );

  const handlePointerLeave = useCallback(() => {
    if (universityMode) return;
    onHoverCountry(null);
  }, [onHoverCountry, universityMode]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerStart.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (pointerStart.current) {
        const dx = e.nativeEvent.clientX - pointerStart.current.x;
        const dy = e.nativeEvent.clientY - pointerStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) return;
      }

      e.stopPropagation();

      // In university mode, skip expensive country finding — just handle background tap
      if (universityMode) {
        onBackgroundTap?.();
        return;
      }

      const point = e.point.clone();
      if (meshRef.current) meshRef.current.worldToLocal(point);
      const { lat, lng } = vec3ToLatLng(point, RADIUS);

      const now = Date.now();
      const country = findCountryByPoint(lat, lng);

      if (country && lastClickCountry.current?.id === country.id && now - lastClickTime.current < 350) {
        onCountryDoubleClick(country);
        lastClickTime.current = 0;
        lastClickCountry.current = null;
      } else {
        if (country) onCountrySelect(country);
        else onBackgroundTap?.();
        lastClickTime.current = now;
        lastClickCountry.current = country;
      }
    },
    [onCountrySelect, onCountryDoubleClick, onBackgroundTap, universityMode],
  );

  return (
    <group>
      {/* Earth textured sphere */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.65} metalness={0.03} />
      </mesh>

      {/* Dynamic clouds */}
      <CloudsLayer reducedAnimation={universityMode ? false : undefined} />

      {/* Inner atmosphere */}
      <mesh scale={1.025}>
        <sphereGeometry args={[RADIUS, 32, 32]} />
        <meshBasicMaterial color="#6eb4f0" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      {/* Outer atmosphere */}
      <mesh scale={1.12}>
        <sphereGeometry args={[RADIUS, 24, 24]} />
        <meshBasicMaterial color="#4a90d9" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* Selected country highlight (red) */}
      {selectedCountry && (
        <CountryHighlight country={selectedCountry} isSelected isHovered={false} />
      )}
      {/* Hovered country highlight (white) — only if different from selected */}
      {hoveredCountry && hoveredCountry.id !== selectedCountry?.id && (
        <CountryHighlight country={hoveredCountry} isSelected={false} isHovered />
      )}

    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Starfield                                                         */
/* ------------------------------------------------------------------ */

function Starfield() {
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 600; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 6;
      pts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    return new Float32Array(pts);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={points} count={points.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.025} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Rotation controller — slow down as user zooms in                   */
/* ------------------------------------------------------------------ */

function RotationController({ controlsRef, reducedAnimation }: { controlsRef: React.RefObject<any>; reducedAnimation?: boolean }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;

    // When reducedAnimation (modal open, tab hidden), slow down auto-rotation significantly
    if (reducedAnimation) {
      ctrl.autoRotateSpeed = 0.1;
      return;
    }

    const dist = camera.position.distanceTo(ctrl.target);
    const t = THREE.MathUtils.clamp((dist - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE), 0, 1);
    const speed = BASE_ROTATION_SPEED * Math.pow(t, 1.4);
    ctrl.autoRotateSpeed = speed;
    ctrl.autoRotate = dist > MIN_DISTANCE + 0.8;
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Zoom controller — smooth double-click & search-triggered zoom      */
/* ------------------------------------------------------------------ */

function ZoomController({
  zoomTarget: target,
  controlsRef,
}: {
  zoomTarget: { lat: number; lng: number; distance?: number } | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const REF_DIR = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const animRef = useRef({
    active: false,
    progress: 0,
    startQuat: new THREE.Quaternion(),
    endQuat: new THREE.Quaternion(),
    startDist: 5.4,
    endDist: 5.4,
  });

  useEffect(() => {
    if (!target || !controlsRef.current) return;

    const ctrl = controlsRef.current;

    // ALWAYS keep the orbit target at the globe center — never move the pivot
    ctrl.target.set(0, 0, 0);

    // Direction of the target point from globe center
    const targetDir = latLngToVec3(target.lat, target.lng, RADIUS).normalize();

    // Current camera state
    const currentPos = camera.position.clone();
    const currentDist = currentPos.length();
    const currentDir = currentPos.normalize();

    // Target distance: preserve current zoom, or use provided distance (e.g. double-click zoom)
    const endDist = target.distance ?? currentDist;

    // Build quaternions that rotate REF_DIR → each direction, then slerp between them
    animRef.current = {
      active: true,
      progress: 0,
      startQuat: new THREE.Quaternion().setFromUnitVectors(REF_DIR, currentDir),
      endQuat: new THREE.Quaternion().setFromUnitVectors(REF_DIR, targetDir),
      startDist: currentDist,
      endDist,
    };
  }, [target, controlsRef, camera, REF_DIR]);

  useFrame((_, delta) => {
    const a = animRef.current;
    if (!a.active || !controlsRef.current) return;

    const ctrl = controlsRef.current;

    // Disable auto-rotate during fly-to so it doesn't fight the animation.
    // RotationController runs before this and re-enables it once we stop.
    ctrl.autoRotate = false;

    a.progress += delta * 1.8;
    const t = Math.min(a.progress, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Slerp the camera direction around the globe center using quaternions
    const resultQuat = a.startQuat.clone().slerp(a.endQuat, eased);
    const dir = REF_DIR.clone().applyQuaternion(resultQuat);

    // Lerp the distance (preserves zoom unless a target distance was specified)
    const dist = a.startDist + (a.endDist - a.startDist) * eased;

    camera.position.copy(dir.multiplyScalar(dist));

    // Lock the orbit target to globe center — never orbit around a marker
    ctrl.target.set(0, 0, 0);
    ctrl.update();

    if (t >= 1) {
      a.active = false;
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Scene                                                             */
/* ------------------------------------------------------------------ */

function Scene({
  onCountrySelect,
  onCountryDoubleClick,
  onBackgroundTap,
  selectedCountry,
  hoveredCountry,
  onHoverCountry,
  zoomTarget,
  controlsRef,
  visitedIds,
  wishlistIds,
  interactionEnabled,
  universityMode,
  universities,
  selectedUniversityId,
  uniWishlistIds,
  uniVisitedIds,
  onUniversitySelect,
  showCountries,
  showUniversities,
  reducedAnimation,
}: {
  onCountrySelect: (c: Country) => void;
  onCountryDoubleClick: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  hoveredCountry: Country | null;
  onHoverCountry: (c: Country | null) => void;
  zoomTarget: { lat: number; lng: number; distance?: number } | null;
  controlsRef: React.RefObject<any>;
  visitedIds: Set<string>;
  wishlistIds: Set<string>;
  interactionEnabled: boolean;
  universityMode?: boolean;
  universities?: UniversityMarkerData[];
  selectedUniversityId?: string | null;
  uniWishlistIds?: Set<string>;
  uniVisitedIds?: Set<string>;
  onUniversitySelect?: (uniId: string) => void;
  showCountries?: boolean;
  showUniversities?: boolean;
  reducedAnimation?: boolean;
}) {
  const guardedSelect = useCallback(
    (c: Country) => { if (interactionEnabled) onCountrySelect(c); },
    [interactionEnabled, onCountrySelect],
  );
  const guardedDoubleClick = useCallback(
    (c: Country) => { if (interactionEnabled) onCountryDoubleClick(c); },
    [interactionEnabled, onCountryDoubleClick],
  );
  const guardedBackgroundTap = useCallback(
    () => { if (interactionEnabled) onBackgroundTap?.(); },
    [interactionEnabled, onBackgroundTap],
  );
  const guardedHover = useCallback(
    (c: Country | null) => { if (interactionEnabled) onHoverCountry(c); },
    [interactionEnabled, onHoverCountry],
  );
  const guardedUniSelect = useCallback(
    (uniId: string) => { if (interactionEnabled && onUniversitySelect) onUniversitySelect(uniId); },
    [interactionEnabled, onUniversitySelect],
  );

  const showCountryMarkers = !universityMode || showCountries !== false;
  const showUniMarkers = universityMode && showUniversities !== false && !!universities && !!onUniversitySelect;

  return (
    <>
      <DayNightCycle reducedAnimation={reducedAnimation} />
      <EarthSphere
        onCountrySelect={guardedSelect}
        onCountryDoubleClick={guardedDoubleClick}
        onBackgroundTap={guardedBackgroundTap}
        selectedCountry={selectedCountry}
        hoveredCountry={hoveredCountry}
        onHoverCountry={guardedHover}
        universityMode={universityMode}
      />
      {showCountryMarkers && (
        <StatusMarkers
          visitedIds={visitedIds}
          wishlistIds={wishlistIds}
          onMarkerClick={guardedSelect}
        />
      )}
      {showUniMarkers && (
        <UniversityClusterMarkers
          universities={universities!}
          selectedId={selectedUniversityId ?? null}
          wishlistIds={uniWishlistIds ?? EMPTY_SET}
          visitedIds={uniVisitedIds ?? EMPTY_SET}
          onMarkerClick={guardedUniSelect}
          interactionEnabled={interactionEnabled}
          controlsRef={controlsRef}
          reducedAnimation={reducedAnimation}
        />
      )}
      <CapitalMarkers />
      <Starfield />
      <RotationController controlsRef={controlsRef} reducedAnimation={reducedAnimation} />
      <ZoomController zoomTarget={zoomTarget} controlsRef={controlsRef} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                  */
/* ------------------------------------------------------------------ */

/** Detect weak devices for adaptive quality reduction */
const IS_WEAK_DEVICE = typeof navigator !== "undefined" &&
  ((navigator.hardwareConcurrency ?? 4) <= 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

function GlobeInner({
  onCountrySelect,
  onBackgroundTap,
  selectedCountry,
  zoomTarget,
  visitedIds,
  wishlistIds,
  universityMode,
  universities,
  selectedUniversityId,
  uniWishlistIds,
  uniVisitedIds,
  onUniversitySelect,
  showCountries = true,
  showUniversities = true,
  reducedAnimation = false,
}: {
  onCountrySelect?: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  zoomTarget?: { lat: number; lng: number; distance?: number } | null;
  visitedIds?: Set<string>;
  wishlistIds?: Set<string>;
  universityMode?: boolean;
  universities?: UniversityMarkerData[];
  selectedUniversityId?: string | null;
  uniWishlistIds?: Set<string>;
  uniVisitedIds?: Set<string>;
  onUniversitySelect?: (uniId: string) => void;
  showCountries?: boolean;
  showUniversities?: boolean;
  reducedAnimation?: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const hoveredCountryRef = useRef<Country | null>(null);
  const [internalZoomTarget, setInternalZoomTarget] = useState<{ lat: number; lng: number; distance?: number } | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<Country | null>(null);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(!document.hidden);

  // Track document visibility to pause animation when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => setIsTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Combined reduced animation: external (modal open) OR tab hidden
  const effectiveReducedAnimation = reducedAnimation || !isTabVisible;

  // Manual rotation is locked until the user taps the "Click" button.
  // Auto-rotate, zoom, animations, and country selection remain active.
  const [interactionEnabled, setInteractionEnabled] = useState<boolean>(false);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  const handleActivate = useCallback(() => {
    if (interactionEnabled) return;
    setInteractionEnabled(true);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 1000);
  }, [interactionEnabled]);

  // External zoom target (from search) takes priority
  const activeZoomTarget = zoomTarget ?? internalZoomTarget;

  const handleDoubleClick = useCallback((c: Country) => {
    setInternalZoomTarget({ lat: c.lat, lng: c.lng, distance: 2.8 });
  }, []);

  const handleHoverWithState = useCallback((c: Country | null) => {
    hoveredCountryRef.current = c;
    setHoveredCountry(c);
  }, []);

  const noopCountrySelect = useCallback((c: Country) => {
    // In university mode, country selection is not used
    void c;
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 5.4], fov: 40, near: 0.01, far: 200 }}
        dpr={IS_WEAK_DEVICE ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: !IS_WEAK_DEVICE, alpha: true, powerPreference: "high-performance" }}
        frameloop={effectiveReducedAnimation ? "demand" : "always"}
      >
        <Suspense fallback={null}>
          <Scene
            onCountrySelect={onCountrySelect ?? noopCountrySelect}
            onCountryDoubleClick={handleDoubleClick}
            onBackgroundTap={onBackgroundTap}
            selectedCountry={selectedCountry}
            hoveredCountry={hoveredCountry}
            onHoverCountry={handleHoverWithState}
            zoomTarget={activeZoomTarget}
            controlsRef={controlsRef}
            visitedIds={visitedIds ?? EMPTY_SET}
            wishlistIds={wishlistIds ?? EMPTY_SET}
            interactionEnabled={interactionEnabled}
            universityMode={universityMode}
            universities={universities}
            selectedUniversityId={selectedUniversityId}
            uniWishlistIds={uniWishlistIds}
            uniVisitedIds={uniVisitedIds}
            onUniversitySelect={onUniversitySelect}
            showCountries={showCountries}
            showUniversities={showUniversities}
            reducedAnimation={effectiveReducedAnimation}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={interactionEnabled}
            enableRotate={interactionEnabled}
            enableDamping={interactionEnabled}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            rotateSpeed={0.4}
            zoomSpeed={1.1}
            autoRotate
            autoRotateSpeed={BASE_ROTATION_SPEED}
            dampingFactor={0.08}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        </Suspense>
      </Canvas>

      {/* "Click" activation button — locks manual rotation until pressed */}
      {!interactionEnabled && (
        <button
          onClick={handleActivate}
          className="globe-click-btn"
          aria-label="Click to interact with the globe"
        >
          <span className="globe-click-btn__label">Click</span>
        </button>
      )}
      {showCheckmark && (
        <div className="globe-click-check" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5L10 17.5L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

const Globe = React.memo(GlobeInner);
export default Globe;
