// RN port of VI_Step2_WarehouseFactory.tsx — Warehouse & Factory verification
// plus the mandatory inspector evidence photo slots (3 for the Legal Address &
// Factory Site, +3 for the Warehouse when its address differs).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import Svg, { Path, Circle } from 'react-native-svg';
import { Warehouse, MapPin, Image as ImageIcon, Camera, X, Crop, Check, RotateCcw, Trash2, AlertTriangle } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications, ViewButton } from './VI_VerifyField';
import { getOwnershipTypeLabel } from './fieldHelpers';
import { compressImage } from '../../../utils/imageCompress';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

export interface FactoryEvidencePhoto {
  name: string;
  url: string; // data URI (compressed)
  id: number;
}

export interface FactoryEvidenceState {
  // Legal Address & Factory Site — inspector evidence photos
  frontView: FactoryEvidencePhoto | null;
  nameBoard: FactoryEvidencePhoto | null;
  routeMap: FactoryEvidencePhoto | null;
  // Warehouse — inspector evidence photos (only collected when the warehouse
  // address differs from the Legal Address & Factory Site). Optional so the
  // host screen's initial 3-slot state remains valid.
  warehouseFrontView?: FactoryEvidencePhoto | null;
  warehouseNameBoard?: FactoryEvidencePhoto | null;
  warehouseRouteMap?: FactoryEvidencePhoto | null;
}

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
  factoryEvidence: FactoryEvidenceState;
  onEvidenceChange: (slot: keyof FactoryEvidenceState, photo: FactoryEvidencePhoto | null) => void;
  evidenceError?: boolean;
}

// ── Image pipeline ──────────────────────────────────────────────────────────
// Two things go wrong if we crop the camera's file directly:
//
//   1. expo-image-manipulator v14 (SDK 54) dropped the legacy `manipulateAsync`
//      helper for a chainable context API, so the call throws outright.
//   2. Camera JPEGs carry EXIF rotation. `asset.width/height` and
//      Image.getSize report the *display* size, but the manipulator crops the
//      *decoded* bitmap — on a rotated photo those two disagree, the
//      display-to-source scale is wrong, and the crop lands on the wrong region
//      at the wrong size.
//
// So every capture goes through one normalising pass first: a resize forces a
// full decode + re-encode, which bakes the rotation into the pixels. The
// dimensions that pass returns are authoritative — the same file, in the same
// pixel space, is what we display and what we crop.

const MAX_EDGE = 1600;

type Prepared = { uri: string; width: number; height: number };
type CropBox = { originX: number; originY: number; width: number; height: number };

const jpegFormat = () => (ImageManipulator as any).SaveFormat?.JPEG ?? 'jpeg';

async function runManipulator(uri: string, apply: (ctx: any) => void, legacyActions: any[]): Promise<Prepared> {
  const IM: any = ImageManipulator;

  // Legacy API — expo-image-manipulator <= v13.
  if (typeof IM.manipulateAsync === 'function') {
    const res = await IM.manipulateAsync(uri, legacyActions, { compress: 0.92, format: jpegFormat() });
    return { uri: res.uri, width: res.width, height: res.height };
  }

  // Context API — v14+.
  const ctx = IM.ImageManipulator?.manipulate?.(uri);
  if (!ctx) throw new Error('expo-image-manipulator is unavailable in this build.');
  apply(ctx);
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.92, format: jpegFormat() });
  return {
    uri: saved.uri,
    width: saved.width ?? rendered.width,
    height: saved.height ?? rendered.height,
  };
}

// Normalise a freshly captured photo and report its true pixel size.
async function prepareForCrop(uri: string, hintW?: number, hintH?: number): Promise<Prepared> {
  // Resize along the long edge so neither orientation gets blown up.
  const portrait = !!hintW && !!hintH && hintH > hintW;
  const resize = portrait ? { height: MAX_EDGE } : { width: MAX_EDGE };
  return runManipulator(uri, (ctx) => ctx.resize(resize), [{ resize }]);
}

async function cropImage(uri: string, crop: CropBox): Promise<Prepared> {
  return runManipulator(uri, (ctx) => ctx.crop(crop), [{ crop }]);
}

// ── Perspective warp ────────────────────────────────────────────────────────
// The checker frames the shot with a free quadrilateral, the way the Drive
// scanner does, so the result has to be un-skewed rather than merely cut out.
// expo-image-manipulator only crops axis-aligned rectangles, so the warp runs
// on the GPU: map the output's unit square back through a homography and
// sample the source per fragment.

type Pt = { x: number; y: number };
type Quad = { tl: Pt; tr: Pt; br: Pt; bl: Pt };

// Flip the snapshot if the warped output ever comes out upside down on a
// device — GL's framebuffer origin is bottom-left, and drivers disagree.
const SNAPSHOT_FLIP = false;
const MAX_OUT_EDGE = 4096;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// Heckbert's unit-square-to-quad projective map. Returns the 3x3 as three rows,
// with the source coordinates already normalised to texture space.
function homography(q: Quad, srcW: number, srcH: number) {
  const { tl: p0, tr: p1, br: p2, bl: p3 } = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
  const den = dx1 * dy2 - dx2 * dy1;

  if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) {
    // Parallelogram — the map is affine, no perspective term.
    g = 0;
    h = 0;
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
  } else if (Math.abs(den) < 1e-9) {
    throw new Error('The selected shape is too flat to straighten.');
  } else {
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
  }
  c = p0.x;
  f = p0.y;

  return {
    row0: [a / srcW, b / srcW, c / srcW],
    row1: [d / srcH, e / srcH, f / srcH],
    row2: [g, h, 1],
  };
}

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // vUv.y runs 0 at the top so it lines up with image rows.
  vUv = vec2((aPos.x + 1.0) * 0.5, (1.0 - aPos.y) * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uRow0;
uniform vec3 uRow1;
uniform vec3 uRow2;
void main() {
  float w = uRow2.x * vUv.x + uRow2.y * vUv.y + uRow2.z;
  float sx = (uRow0.x * vUv.x + uRow0.y * vUv.y + uRow0.z) / w;
  float sy = (uRow1.x * vUv.x + uRow1.y * vUv.y + uRow1.z) / w;
  gl_FragColor = texture2D(uTex, vec2(sx, sy));
}`;

function compile(gl: any, type: number, src: string) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'Shader compile failed.');
  }
  return sh;
}

// Renders into `gl`, which the caller supplies. quad is in SOURCE PIXELS.
async function renderWarp(gl: any, uri: string, quad: Quad, srcW: number, srcH: number): Promise<Prepared> {
  const outW = Math.max(1, Math.min(MAX_OUT_EDGE, Math.round(Math.max(dist(quad.tl, quad.tr), dist(quad.bl, quad.br)))));
  const outH = Math.max(1, Math.min(MAX_OUT_EDGE, Math.round(Math.max(dist(quad.tl, quad.bl), dist(quad.tr, quad.br)))));
  const H = homography(quad, srcW, srcH);

  // expo-gl reads localUri/width/height off the object it is handed. Asset
  // leaves width/height unset for file:// URIs, and a texture uploaded with no
  // dimensions comes back empty — which is what a blank crop looks like.
  const asset: any = Asset.fromURI(uri);
  try {
    await asset.downloadAsync();
  } catch {
    // A local file needs no download; fall through to the manual fields below.
  }
  if (!asset.localUri) asset.localUri = uri;
  if (!asset.uri) asset.uri = uri;
  if (!asset.width) asset.width = srcW;
  if (!asset.height) asset.height = srcH;

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed.');
  }
  gl.useProgram(program);

  // Full-viewport triangle strip.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Offscreen target at exactly the output size, so the result isn't capped by
  // the size of the view that lent us the context.
  const outTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, outTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, outW, outH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Could not allocate a render target for the crop.');
  }

  // Source texture last, so it is what stays bound on unit 0 at draw time.
  const srcTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.uniform1i(gl.getUniformLocation(program, 'uTex'), 0);
  gl.uniform3fv(gl.getUniformLocation(program, 'uRow0'), H.row0);
  gl.uniform3fv(gl.getUniformLocation(program, 'uRow1'), H.row1);
  gl.uniform3fv(gl.getUniformLocation(program, 'uRow2'), H.row2);

  gl.viewport(0, 0, outW, outH);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.flush();

  // Sanity probe. readPixels also forces the queued commands to finish before
  // the snapshot is taken. A photo that reads pure black at every sample means
  // the texture never uploaded, so bail out and let the caller fall back rather
  // than handing the checker an empty frame.
  const probe = new Uint8Array(4);
  const samples: [number, number][] = [
    [outW >> 1, outH >> 1],
    [outW >> 2, outH >> 2],
    [(outW * 3) >> 2, outH >> 2],
    [outW >> 2, (outH * 3) >> 2],
    [(outW * 3) >> 2, (outH * 3) >> 2],
  ];
  let lit = false;
  for (const [px, py] of samples) {
    gl.readPixels(Math.min(px, outW - 1), Math.min(py, outH - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
    if (probe[0] || probe[1] || probe[2]) {
      lit = true;
      break;
    }
  }
  if (!lit) throw new Error('The GPU returned an empty frame.');

  const snap: any = await GLView.takeSnapshotAsync(gl, {
    framebuffer: fb,
    rect: { x: 0, y: 0, width: outW, height: outH },
    format: 'jpeg',
    compress: 0.92,
    flip: SNAPSHOT_FLIP,
  });

  const outUri = snap?.uri ?? snap?.localUri;
  if (!outUri) throw new Error('The straightened image could not be saved.');
  return { uri: outUri, width: outW, height: outH };
}

// Axis-aligned box that contains the quad, used both for rectangular frames and
// as the fallback when straightening isn't available.
function boundingCrop(q: Quad, srcW: number, srcH: number): CropBox {
  const xs = [q.tl.x, q.tr.x, q.br.x, q.bl.x];
  const ys = [q.tl.y, q.tr.y, q.br.y, q.bl.y];
  const originX = Math.max(0, Math.round(Math.min(...xs)));
  const originY = Math.max(0, Math.round(Math.min(...ys)));
  const width = Math.min(srcW - originX, Math.round(Math.max(...xs) - originX));
  const height = Math.min(srcH - originY, Math.round(Math.max(...ys) - originY));
  if (width < 1 || height < 1) throw new Error('The selected area is too small to crop.');
  return { originX, originY, width, height };
}

// ── Crop surface ────────────────────────────────────────────────────────────
// Drive-style: a draggable quadrilateral with round handles on every corner and
// every edge, everything outside it dimmed, and a magnifier under the finger.
// Evidence is shot live, so the OS gallery-crop dialog isn't available to us.
// This is a plain view, NOT a Modal — it shares the parent's single Modal so no
// two modals ever transition at the same time.
const GRAB = 44;      // touch target for each handle
const DOT = 9;        // drawn handle radius
const PAD = 30;       // keeps handles off the container edge (Android clips overflow)
const MIN_SIDE = 60;  // smallest allowed distance between adjacent corners
const LOUPE = 116;
const LOUPE_ZOOM = 2.4;

type HandleId = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l';
const CORNER_IDS: HandleId[] = ['tl', 'tr', 'br', 'bl'];
// Which corners each edge handle carries with it.
const EDGE_CORNERS: Record<string, ('tl' | 'tr' | 'br' | 'bl')[]> = {
  t: ['tl', 'tr'],
  r: ['tr', 'br'],
  b: ['bl', 'br'],
  l: ['tl', 'bl'],
};

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function pointInQuad(p: Pt, q: Quad) {
  const poly = [q.tl, q.tr, q.br, q.bl];
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function CropStage({
  uri,
  srcWidth,
  srcHeight,
  onCancel,
  onDone,
}: {
  uri: string;
  srcWidth?: number | null;
  srcHeight?: number | null;
  onCancel: () => void;
  onDone: (result: Prepared) => void;
}) {
  // srcWidth/srcHeight come from the normalising pass and are trustworthy.
  // Image.getSize is only an emergency fallback.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    srcWidth && srcHeight ? { w: srcWidth, h: srcHeight } : null,
  );
  const [sizeFailed, setSizeFailed] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [quad, setQuad] = useState<Quad | null>(null);
  const [loupe, setLoupe] = useState<Pt | null>(null);
  const [busy, setBusy] = useState(false);

  // expo-gl's headless context can't be snapshotted reliably on every device —
  // that path is what produced blank crops. Borrow a context from a real (1px,
  // invisible) GLView instead, which is the well-trodden route.
  const [glJob, setGlJob] = useState<{ quad: Quad; w: number; h: number } | null>(null);
  const warpWaiter = useRef<{ resolve: (r: Prepared) => void; reject: (e: any) => void } | null>(null);

  const warpOnGpu = (srcQuad: Quad, w: number, h: number) =>
    new Promise<Prepared>((resolve, reject) => {
      warpWaiter.current = { resolve, reject };
      setGlJob({ quad: srcQuad, w, h });
    });

  // Pan handlers run outside React's render cycle, so live geometry is mirrored
  // into refs for them to read.
  const quadRef = useRef<Quad | null>(quad);
  quadRef.current = quad;
  const startRef = useRef<Quad | null>(null);

  useEffect(() => {
    if (natural) return;
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && setNatural({ w, h }),
      () => alive && setSizeFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [uri, natural]);

  // Where the photo sits inside the container once "contain"-fitted, inset by
  // PAD so a handle centred on a corner is never clipped by the container.
  const fit = useMemo(() => {
    if (!natural) return null;
    const bw = area.w - PAD * 2;
    const bh = area.h - PAD * 2;
    if (bw <= 0 || bh <= 0) return null;
    const scale = Math.min(bw / natural.w, bh / natural.h);
    const w = natural.w * scale;
    const h = natural.h * scale;
    return { x: PAD + (bw - w) / 2, y: PAD + (bh - h) / 2, w, h, scale };
  }, [natural, area]);

  const fitRef = useRef(fit);
  fitRef.current = fit;

  // Select the whole photo once per image. Guarded by uri so a stray onLayout
  // can't snap the frame back to full size in the middle of a drag.
  const initedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!fit) return;
    if (initedFor.current === uri) return;
    initedFor.current = uri;
    const { x, y, w, h } = fit;
    setQuad({
      tl: { x, y },
      tr: { x: x + w, y },
      br: { x: x + w, y: y + h },
      bl: { x, y: y + h },
    });
  }, [fit, uri]);

  const clampToPhoto = (p: Pt, f: any): Pt => ({
    x: Math.min(Math.max(p.x, f.x), f.x + f.w),
    y: Math.min(Math.max(p.y, f.y), f.y + f.h),
  });

  // A corner may not be dragged on top of either of its neighbours.
  const neighbours: Record<string, ('tl' | 'tr' | 'br' | 'bl')[]> = {
    tl: ['tr', 'bl'],
    tr: ['tl', 'br'],
    br: ['bl', 'tr'],
    bl: ['br', 'tl'],
  };

  const handlesRef = useRef<Record<HandleId, any> | null>(null);
  if (!handlesRef.current) {
    const make = (id: HandleId) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Don't let an ancestor scroll view steal the drag mid-gesture.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = quadRef.current ? { ...quadRef.current } : null;
          const s = startRef.current;
          if (!s) return;
          setLoupe(CORNER_IDS.includes(id) ? s[id as 'tl'] : mid(s[EDGE_CORNERS[id][0]], s[EDGE_CORNERS[id][1]]));
        },
        onPanResponderMove: (_e, g) => {
          const f = fitRef.current;
          const s = startRef.current;
          if (!f || !s) return;
          const next: Quad = { ...s };

          if (CORNER_IDS.includes(id)) {
            const key = id as 'tl' | 'tr' | 'br' | 'bl';
            const moved = clampToPhoto({ x: s[key].x + g.dx, y: s[key].y + g.dy }, f);
            // Refuse a move that would collapse the shape onto a neighbour.
            const ok = neighbours[key].every((n) => dist(moved, s[n]) >= MIN_SIDE);
            if (ok) next[key] = moved;
            setLoupe(next[key]);
          } else {
            // Edge handle: carry both of its corners, and only as far as the
            // tighter of the two can go, so the edge stays straight.
            const [c1, c2] = EDGE_CORNERS[id];
            const m1 = clampToPhoto({ x: s[c1].x + g.dx, y: s[c1].y + g.dy }, f);
            const m2 = clampToPhoto({ x: s[c2].x + g.dx, y: s[c2].y + g.dy }, f);
            const dx = Math.abs(m1.x - s[c1].x) < Math.abs(m2.x - s[c2].x) ? m1.x - s[c1].x : m2.x - s[c2].x;
            const dy = Math.abs(m1.y - s[c1].y) < Math.abs(m2.y - s[c2].y) ? m1.y - s[c1].y : m2.y - s[c2].y;
            const p1 = { x: s[c1].x + dx, y: s[c1].y + dy };
            const p2 = { x: s[c2].x + dx, y: s[c2].y + dy };
            const others = CORNER_IDS.filter((k) => k !== c1 && k !== c2) as ('tl' | 'tr' | 'br' | 'bl')[];
            const ok = others.every((o) => dist(p1, s[o]) >= MIN_SIDE && dist(p2, s[o]) >= MIN_SIDE);
            if (ok) {
              next[c1] = p1;
              next[c2] = p2;
            }
            setLoupe(mid(next[c1], next[c2]));
          }

          setQuad(next);
        },
        onPanResponderRelease: () => setLoupe(null),
        onPanResponderTerminate: () => setLoupe(null),
      });
    handlesRef.current = {
      tl: make('tl'), tr: make('tr'), br: make('br'), bl: make('bl'),
      t: make('t'), r: make('r'), b: make('b'), l: make('l'),
    };
  }
  const handles = handlesRef.current;

  // Dragging inside the shape slides the whole frame.
  const movePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => {
        const q = quadRef.current;
        return !!q && pointInQuad({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }, q);
      },
      onMoveShouldSetPanResponder: (e) => {
        const q = quadRef.current;
        return !!q && pointInQuad({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }, q);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startRef.current = quadRef.current ? { ...quadRef.current } : null;
      },
      onPanResponderMove: (_e, g) => {
        const f = fitRef.current;
        const s = startRef.current;
        if (!f || !s) return;
        // Clamp the translation once for the whole shape so it never deforms.
        const xs = CORNER_IDS.map((k) => s[k as 'tl'].x);
        const ys = CORNER_IDS.map((k) => s[k as 'tl'].y);
        const dx = Math.min(Math.max(g.dx, f.x - Math.min(...xs)), f.x + f.w - Math.max(...xs));
        const dy = Math.min(Math.max(g.dy, f.y - Math.min(...ys)), f.y + f.h - Math.max(...ys));
        setQuad({
          tl: { x: s.tl.x + dx, y: s.tl.y + dy },
          tr: { x: s.tr.x + dx, y: s.tr.y + dy },
          br: { x: s.br.x + dx, y: s.br.y + dy },
          bl: { x: s.bl.x + dx, y: s.bl.y + dy },
        });
      },
    }),
  ).current;

  const reset = () => {
    if (!fit) return;
    const { x, y, w, h } = fit;
    setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + h }, bl: { x, y: y + h } });
  };

  const apply = async () => {
    const f = fitRef.current;
    const q = quadRef.current;
    if (!f || !q || !natural || busy) return;
    setBusy(true);

    // Display space → source pixels.
    const toSrc = (p: Pt): Pt => ({ x: (p.x - f.x) / f.scale, y: (p.y - f.y) / f.scale });
    const src: Quad = { tl: toSrc(q.tl), tr: toSrc(q.tr), br: toSrc(q.br), bl: toSrc(q.bl) };

    // An untouched or purely rectangular frame doesn't need the GPU — the plain
    // crop is cheaper and exact.
    const tol = 1.5;
    const isRect =
      Math.abs(src.tl.x - src.bl.x) < tol &&
      Math.abs(src.tr.x - src.br.x) < tol &&
      Math.abs(src.tl.y - src.tr.y) < tol &&
      Math.abs(src.bl.y - src.br.y) < tol;

    try {
      if (isRect) {
        onDone(await cropImage(uri, boundingCrop(src, natural.w, natural.h)));
        return;
      }

      try {
        onDone(await warpOnGpu(src, natural.w, natural.h));
      } catch {
        // Straightening failed on this device. Give the checker the surrounding
        // rectangle rather than a blank frame, and say what happened.
        const box = boundingCrop(src, natural.w, natural.h);
        const fallback = await cropImage(uri, box);
        showErrorToast(
          'Straightening unavailable',
          'Cropped to the surrounding rectangle instead.',
        );
        onDone(fallback);
      }
    } catch (err: any) {
      showErrorToast('Crop failed', err?.message || 'Could not crop this photo.');
    } finally {
      setBusy(false);
    }
  };

  const quadPath = quad
    ? `M${quad.tl.x} ${quad.tl.y} L${quad.tr.x} ${quad.tr.y} L${quad.br.x} ${quad.br.y} L${quad.bl.x} ${quad.bl.y} Z`
    : '';
  const dots: { id: HandleId; p: Pt }[] = quad
    ? [
        { id: 'tl', p: quad.tl },
        { id: 'tr', p: quad.tr },
        { id: 'br', p: quad.br },
        { id: 'bl', p: quad.bl },
        { id: 't', p: mid(quad.tl, quad.tr) },
        { id: 'r', p: mid(quad.tr, quad.br) },
        { id: 'b', p: mid(quad.bl, quad.br) },
        { id: 'l', p: mid(quad.tl, quad.bl) },
      ]
    : [];

  return (
    <View className="flex-1 bg-black">
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
        <TouchableOpacity onPress={onCancel} hitSlop={12} accessibilityLabel="Cancel crop" className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
          <X size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-sm font-semibold">Adjust Crop</Text>
        <TouchableOpacity onPress={reset} hitSlop={12} accessibilityLabel="Reset crop area" className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
          <RotateCcw size={17} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View
        className="flex-1"
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {fit && (
          <Image
            source={{ uri }}
            style={{ position: 'absolute', left: fit.x, top: fit.y, width: fit.w, height: fit.h }}
            resizeMode="stretch"
          />
        )}

        {!fit && (
          <View className="absolute inset-0 items-center justify-center">
            {sizeFailed ? (
              <Text className="text-white/70 text-sm px-8 text-center">
                This photo could not be measured. Go back and use it as shot, or retake it.
              </Text>
            ) : (
              <ActivityIndicator size="large" color="#ffffff" />
            )}
          </View>
        )}

        {/* Whole-frame drag sits under the overlay and the handles. */}
        {quad && <View {...movePan.panHandlers} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />}

        {/* Dim everything outside the shape, then outline it. */}
        {quad && area.w > 0 && (
          <Svg width={area.w} height={area.h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Path
              d={`M0 0 H${area.w} V${area.h} H0 Z ${quadPath}`}
              fill="rgba(0,0,0,0.58)"
              fillRule="evenodd"
            />
            <Path d={quadPath} fill="none" stroke="#ffffff" strokeWidth={2} />
            {dots.map((d) => (
              <Circle
                key={d.id}
                cx={d.p.x}
                cy={d.p.y}
                r={DOT}
                fill="#ffffff"
                stroke="#e01a1b"
                strokeWidth={3}
              />
            ))}
          </Svg>
        )}

        {/* Invisible touch targets, one per dot. */}
        {quad &&
          dots.map((d) => (
            <View
              key={d.id}
              {...handles[d.id].panHandlers}
              accessibilityLabel={`Adjust ${d.id} handle`}
              style={{ position: 'absolute', left: d.p.x - GRAB / 2, top: d.p.y - GRAB / 2, width: GRAB, height: GRAB }}
            />
          ))}

        {/* Lends its GL context to the warp, then unmounts. */}
        {glJob && (
          <GLView
            style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0 }}
            onContextCreate={async (gl) => {
              const waiter = warpWaiter.current;
              warpWaiter.current = null;
              try {
                waiter?.resolve(await renderWarp(gl, uri, glJob.quad, glJob.w, glJob.h));
              } catch (e) {
                waiter?.reject(e);
              } finally {
                setGlJob(null);
              }
            }}
          />
        )}

        {/* Magnifier — parks on whichever top corner the finger isn't near. */}
        {loupe && fit && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 12,
              left: loupe.x > area.w / 2 ? 12 : undefined,
              right: loupe.x > area.w / 2 ? undefined : 12,
              width: LOUPE,
              height: LOUPE,
              borderRadius: LOUPE / 2,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: '#ffffff',
              backgroundColor: '#000000',
            }}
          >
            <Image
              source={{ uri }}
              resizeMode="stretch"
              style={{
                position: 'absolute',
                width: fit.w * LOUPE_ZOOM,
                height: fit.h * LOUPE_ZOOM,
                left: LOUPE / 2 - (loupe.x - fit.x) * LOUPE_ZOOM,
                top: LOUPE / 2 - (loupe.y - fit.y) * LOUPE_ZOOM,
              }}
            />
            <View style={{ position: 'absolute', left: LOUPE / 2 - 10, top: LOUPE / 2 - 1, width: 20, height: 2, backgroundColor: '#e01a1b' }} />
            <View style={{ position: 'absolute', left: LOUPE / 2 - 1, top: LOUPE / 2 - 10, width: 2, height: 20, backgroundColor: '#e01a1b' }} />
          </View>
        )}
      </View>

      <View className="px-4 pb-10 pt-4" style={{ rowGap: 10 }}>
        <Text className="text-white/50 text-xs text-center">
          Drag the dots to the edges of what you want. A slanted shape is straightened automatically.
        </Text>
        <View className="flex-row" style={{ columnGap: 12 }}>
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 items-center justify-center rounded-xl border-2 border-white/30 py-3"
          >
            <Text className="text-white text-base font-bold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={apply}
            disabled={busy || !fit}
            className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-500 py-3"
            style={{ columnGap: 8, opacity: busy || !fit ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color="#ffffff" /> : <Check size={18} color="#ffffff" strokeWidth={3} />}
            <Text className="text-white text-base font-bold">{busy ? 'Working…' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Remove confirmation ─────────────────────────────────────────────────────
// A native Alert here looks like a system error rather than a deliberate step,
// and it can't show which photo is about to go. This dialog carries the app's
// own styling and a thumbnail, so the checker sees exactly what they're
// deleting before it's gone.
function ConfirmRemoveDialog({
  visible,
  label,
  previewUri,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  label: string;
  previewUri?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onCancel}>
        <Pressable
          className="w-full bg-white rounded-2xl overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center px-5 pt-6 pb-2">
            <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-3">
              <AlertTriangle size={24} color="#dc2626" strokeWidth={2.25} />
            </View>
            <Text className="text-lg font-bold text-slate-900 text-center">Remove this photo?</Text>
            <Text className="text-sm text-slate-600 text-center mt-1.5 leading-5">
              This evidence photo is required, and it can only be re-taken at the site.
            </Text>
          </View>

          <View className="flex-row items-center mx-5 mt-3 mb-1 p-3 rounded-xl bg-slate-50 border border-slate-200" style={{ columnGap: 12 }}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View className="w-11 h-11 rounded-lg bg-slate-200 items-center justify-center">
                <ImageIcon size={18} color="#94a3b8" />
              </View>
            )}
            <Text className="text-sm font-semibold text-slate-800 flex-1" numberOfLines={2}>
              {label}
            </Text>
          </View>

          <View className="flex-row px-5 pt-4 pb-5" style={{ columnGap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityRole="button"
              className="rounded-xl border border-slate-200 bg-white items-center justify-center"
              style={{ flex: 1, minHeight: 46 }}
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              accessibilityRole="button"
              className="flex-row items-center justify-center rounded-xl bg-red-600 px-3"
              style={{ flex: 1.4, minHeight: 46, columnGap: 6 }}
            >
              <Trash2 size={16} color="#ffffff" strokeWidth={2.5} />
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Evidence slot ───────────────────────────────────────────────────────────
function EvidenceUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FactoryEvidencePhoto | null | undefined;
  onChange: (photo: FactoryEvidencePhoto | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  // Freshly captured shot awaiting the checker's OK / Crop decision.
  const [pending, setPending] = useState<Prepared | null>(null);
  // Both screens live in ONE Modal. Two modals transitioning at once is the
  // classic reason the crop screen never appeared.
  const [stage, setStage] = useState<'confirm' | 'crop'>('confirm');
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const closePending = () => {
    setPending(null);
    setStage('confirm');
  };

  // Camera only — gallery upload is deliberately unavailable so evidence can't
  // be sourced from an old or third-party photo.
  const capture = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to capture evidence photos.');
        return;
      }
      // No allowsEditing: the checker chooses whether to crop on the next screen.
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setBusy(true);
      const prepared = await prepareForCrop(asset.uri, asset.width, asset.height);
      setStage('confirm');
      setPending(prepared);
    } catch (err: any) {
      showErrorToast('Camera Error', err?.message || 'Failed to prepare the photo.');
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const dataUri = await compressImage(pending.uri);
      const name = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      onChange({ name, url: dataUri, id: Date.now() });
      closePending();
      showSuccessToast('Evidence Added', `${label} saved.`);
    } catch (err: any) {
      showErrorToast('Upload Failed', err?.message || 'Could not save this photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    closePending();
    // Let the modal finish dismissing before the camera activity opens.
    setTimeout(capture, 350);
  };

  // Every slot is mandatory, and the photo can only be re-taken on site — so a
  // stray tap on the little X should not silently discard it.
  const doRemove = () => {
    setConfirmingRemove(false);
    onChange(null);
    showSuccessToast('Photo Removed', `${label} was deleted.`);
  };

  return (
    <View style={{ rowGap: 8 }}>
      <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
        {label} — Inspector Evidence Photo <Text className="text-red-500">*</Text>
      </Text>
      {value ? (
        <View className="self-start relative">
          <Image source={{ uri: value.url }} style={{ width: 128, height: 128, borderRadius: 12 }} className="border border-emerald-200" resizeMode="cover" />
          <TouchableOpacity
            onPress={() => setConfirmingRemove(true)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
            hitSlop={8}
            className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-1"
          >
            <X size={12} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="text-xs text-slate-500 mt-1" style={{ maxWidth: 128 }} numberOfLines={1}>{value.name}</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={capture}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Capture ${label}`}
          className="flex-row items-center px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 self-start"
          style={{ columnGap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator size="small" color="#e01a1b" /> : <Camera size={16} color="#475569" />}
          <Text className="text-slate-600 text-sm font-medium">{busy ? 'Processing…' : 'Take Evidence Photo'}</Text>
        </TouchableOpacity>
      )}

      <ConfirmRemoveDialog
        visible={confirmingRemove}
        label={label}
        previewUri={value?.url}
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={doRemove}
      />

      {/* Single modal: confirm the shot, or switch to the crop surface in place. */}
      <Modal
        visible={!!pending}
        transparent={false}
        animationType="fade"
        onRequestClose={() => (stage === 'crop' ? setStage('confirm') : closePending())}
      >
        {stage === 'crop' && pending ? (
          <CropStage
            uri={pending.uri}
            srcWidth={pending.width}
            srcHeight={pending.height}
            onCancel={() => setStage('confirm')}
            onDone={(result) => {
              // Carry the cropped file's real dimensions forward so a second
              // pass over the same photo maps correctly too.
              setPending(result);
              setStage('confirm');
            }}
          />
        ) : (
          <View className="flex-1 bg-black">
            <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
              <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>{label}</Text>
              <TouchableOpacity
                onPress={closePending}
                hitSlop={12}
                accessibilityLabel="Discard photo"
                className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="flex-1 px-4">
              {pending && <Image source={{ uri: pending.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
            </View>

            <View className="px-4 pb-10 pt-4" style={{ rowGap: 12 }}>
              <View className="flex-row" style={{ columnGap: 12 }}>
                <TouchableOpacity
                  onPress={() => setStage('crop')}
                  disabled={busy}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-white/40 py-3"
                  style={{ columnGap: 8, opacity: busy ? 0.6 : 1 }}
                >
                  <Crop size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text className="text-white text-base font-bold">Crop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={accept}
                  disabled={busy}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-emerald-600 py-3"
                  style={{ columnGap: 8, opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? <ActivityIndicator size="small" color="#ffffff" /> : <Check size={18} color="#ffffff" strokeWidth={3} />}
                  <Text className="text-white text-base font-bold">{busy ? 'Uploading…' : 'OK'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={retake} disabled={busy} className="items-center py-2">
                <Text className="text-white/70 text-sm font-medium">Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const eq = (a: any, b: any) => (a || '').trim() === (b || '').trim();

// The Warehouse Address counts as "same as" the Legal Address & Factory Site
// when the vendor didn't enter a separate warehouse address, or entered one
// that matches the legal/factory address field-for-field.
export function detectSameAsWarehouse(v: any): boolean {
  if (!v.warehouseAddress && !v.warehouseCity) return true;
  return (
    eq(v.warehouseAddress, v.factoryAddress) &&
    eq(v.warehouseCity, v.factoryCity) &&
    eq(v.warehouseState, v.factoryState) &&
    eq(v.warehouseZipCode, v.factoryZipCode) &&
    eq(v.warehouseCountry, v.factoryCountry)
  );
}

// Vendor-uploaded photos are all stored as type='OTHER' documents. The Legal
// Address & Factory Site photos are prefixed "Factory Site …", while the
// Warehouse photos are named "Factory …".
const FACTORY_SITE_PHOTO_ORDER: Record<string, number> = {
  'Factory Site Name Board': 0,
  'Factory Site Front View': 1,
  'Factory Site Back View': 2,
  'Factory Site Left View': 3,
  'Factory Site Right View': 4,
  'Factory Site Road View': 5,
  'Factory Site Interior': 6,
  'Factory Site Image (Other)': 7,
};
const WAREHOUSE_PHOTO_ORDER: Record<string, number> = {
  'Factory Name Board': 0,
  'Factory Front View': 1,
  'Factory Back View': 2,
  'Factory Left View': 3,
  'Factory Right View': 4,
  'Factory Road View': 5,
  'Factory Interior': 6,
  'Factory Image (Other)': 7,
};
const isFactorySiteDoc = (name: string) => (name || '').startsWith('Factory Site');

export default function VI_Step2_WarehouseFactory({
  vendor: v,
  verifications,
  onChange,
  onRegisterFields,
  factoryEvidence,
  onEvidenceChange,
  evidenceError,
}: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const otherDocs = Array.isArray(v.documents) ? v.documents.filter((d: any) => d.type === 'OTHER') : [];
  // Legal Address & Factory Site images — "Factory Site …" documents.
  const legalImages = otherDocs
    .filter((d: any) => isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Factory Site Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (FACTORY_SITE_PHOTO_ORDER[a.label] ?? 99) - (FACTORY_SITE_PHOTO_ORDER[b.label] ?? 99));
  // Warehouse images — every other "Factory …" document.
  const warehouseImages = otherDocs
    .filter((d: any) => !isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Warehouse Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (WAREHOUSE_PHOTO_ORDER[a.label] ?? 99) - (WAREHOUSE_PHOTO_ORDER[b.label] ?? 99));

  const isSameAsWarehouse = detectSameAsWarehouse(v);

  useEffect(() => {
    const keys: string[] = [
      // ── Legal Address & Factory Site ──
      'w_legalOwnershipType',
      'w_legalCapacity',
      ...(v.factoryAddress ? ['w_legalAddress'] : []),
      ...(v.addressLine2 ? ['w_legalAddressLine2'] : []),
      ...(v.addressLine3 ? ['w_legalAddressLine3'] : []),
      ...(v.landmark ? ['w_legalLandmark'] : []),
      ...(v.factoryCity ? ['w_legalCity'] : []),
      ...(v.factoryState ? ['w_legalState'] : []),
      ...(v.factoryZipCode ? ['w_legalZipCode'] : []),
      ...(v.factoryCountry ? ['w_legalCountry'] : []),
      ...(v.mapLink ? ['w_mapLink'] : []),
      ...legalImages.map((_: any, idx: number) => `w_legalImg_${idx}`),
      // ── Warehouse Address ──
      ...(isSameAsWarehouse
        ? ['w_sameWarehouse']
        : [
            'w_whOwnershipType',
            'w_whCapacity',
            ...(v.warehouseAddress ? ['w_whAddress'] : []),
            ...(v.warehouseAddressLine2 ? ['w_whAddressLine2'] : []),
            ...(v.warehouseAddressLine3 ? ['w_whAddressLine3'] : []),
            ...(v.warehouseLandmark ? ['w_whLandmark'] : []),
            ...(v.warehouseCity ? ['w_whCity'] : []),
            ...(v.warehouseState ? ['w_whState'] : []),
            ...(v.warehouseZipCode ? ['w_whZipCode'] : []),
            ...(v.warehouseCountry ? ['w_whCountry'] : []),
          ]),
      ...warehouseImages.map((_: any, idx: number) => `w_whImg_${idx}`),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Warehouse & Factory Details</Text>
        <Text className="text-slate-500 text-sm">Verify the warehouse and factory address and physical infrastructure.</Text>
      </View>

      {/* Section 1: Legal Address & Factory Site */}
      <SectionBlock title="Legal Address & Factory Site" icon={<Warehouse size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {vf('w_legalOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.factoryOwnershipType))}
          {vf('w_legalCapacity', 'Warehousing Capacity', v.factorySize)}
          {v.factoryAddress && vf('w_legalAddress', 'Address Line 1', v.factoryAddress)}
          {v.addressLine2 && vf('w_legalAddressLine2', 'Address Line 2', v.addressLine2)}
          {v.addressLine3 && vf('w_legalAddressLine3', 'Address Line 3', v.addressLine3)}
          {v.landmark && vf('w_legalLandmark', 'Landmark', v.landmark)}
          {v.factoryCity && vf('w_legalCity', 'City', v.factoryCity)}
          {v.factoryState && vf('w_legalState', 'State', v.factoryState)}
          {v.factoryZipCode && vf('w_legalZipCode', 'ZIP / Postal Code', v.factoryZipCode)}
          {v.factoryCountry && vf('w_legalCountry', 'Country', v.factoryCountry)}
          {v.mapLink && vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
        </View>
        {/* Factory Images — only the Legal Address & Factory Site photos */}
        {legalImages.length > 0 && (
          <View style={{ rowGap: 12 }} className="mt-2">
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <ImageIcon size={14} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Factory Images</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {legalImages.map((img: any, idx: number) => (
                <View key={idx} style={{ width: '48%' }}>
                  <VerifyField
                    fieldKey={`w_legalImg_${idx}`}
                    label={img.label}
                    value={img.url}
                    type="image"
                    verifications={verifications}
                    onChange={onChange}
                    compact
                    headerAction={img.url ? <ViewButton url={img.url} name={img.label} isImage /> : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </SectionBlock>

      {/* Section 2: Warehouse Address */}
      <SectionBlock title="Warehouse Address" icon={<MapPin size={16} color="#e01a1b" />}>
        {isSameAsWarehouse ? (
          <View style={{ rowGap: 16 }}>
            <View className="flex-row items-start p-4 bg-brand-50 border border-brand-200 rounded-xl" style={{ columnGap: 12 }}>
              <MapPin size={16} color="#e01a1b" />
              <Text className="text-sm text-brand-700 font-medium flex-1">
                Warehouse Address is the same as the Legal Address & Factory Site provided above. Please verify.
              </Text>
            </View>
            <VerifyField
              fieldKey="w_sameWarehouse"
              label="Warehouse Address"
              value="Same as Legal Address & Factory Site"
              verifications={verifications}
              onChange={onChange}
            />
          </View>
        ) : (
          <View style={{ rowGap: 16 }}>
            {vf('w_whOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.ownershipType))}
            {vf('w_whCapacity', 'Warehousing Capacity', v.warehouseSize)}
            {v.warehouseAddress && vf('w_whAddress', 'Address Line 1', v.warehouseAddress)}
            {v.warehouseAddressLine2 && vf('w_whAddressLine2', 'Address Line 2', v.warehouseAddressLine2)}
            {v.warehouseAddressLine3 && vf('w_whAddressLine3', 'Address Line 3', v.warehouseAddressLine3)}
            {v.warehouseLandmark && vf('w_whLandmark', 'Landmark', v.warehouseLandmark)}
            {v.warehouseCity && vf('w_whCity', 'City', v.warehouseCity)}
            {v.warehouseState && vf('w_whState', 'State', v.warehouseState)}
            {v.warehouseZipCode && vf('w_whZipCode', 'ZIP / Postal Code', v.warehouseZipCode)}
            {v.warehouseCountry && vf('w_whCountry', 'Country', v.warehouseCountry)}
          </View>
        )}
        {/* Warehouse Images — only the Warehouse Address photos, two per row */}
        {warehouseImages.length > 0 && (
          <View style={{ rowGap: 12 }} className="mt-2">
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <ImageIcon size={14} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Warehouse Images</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {warehouseImages.map((img: any, idx: number) => (
                <View key={idx} style={{ width: '48%' }}>
                  <VerifyField
                    fieldKey={`w_whImg_${idx}`}
                    label={img.label}
                    value={img.url}
                    type="image"
                    verifications={verifications}
                    onChange={onChange}
                    compact
                    headerAction={img.url ? <ViewButton url={img.url} name={img.label} isImage /> : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </SectionBlock>

      {/* Inspector Evidence Photos */}
      <SectionBlock title="Inspector Evidence Photos" icon={<Camera size={16} color="#e01a1b" />}>
        <Text className="text-xs text-slate-500 -mt-2">
          Capture photos during the visit to serve as inspection evidence — camera only, gallery uploads are not accepted.{' '}
          {isSameAsWarehouse
            ? 'All three Legal Address & Factory Site photos are required.'
            : 'All three Legal Address & Factory Site photos and all three Warehouse photos are required.'}
        </Text>
        {evidenceError && (
          <View className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <Text className="text-sm font-semibold text-red-600">
              {isSameAsWarehouse
                ? 'All three evidence photos are required before continuing.'
                : 'All six evidence photos (Legal Address & Factory Site and Warehouse) are required before continuing.'}
            </Text>
          </View>
        )}
        <View style={{ rowGap: 24 }} className={evidenceError ? 'border-2 border-red-300 rounded-xl p-2' : ''}>
          {/* Group 1: Legal Address & Factory Site */}
          <View style={{ rowGap: 16 }}>
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <Warehouse size={16} color="#e01a1b" />
              <Text className="text-sm font-bold text-slate-700">Legal Address & Factory Site — Photo Evidence</Text>
            </View>
            <EvidenceUpload label="Factory Site Name Board" value={factoryEvidence.nameBoard} onChange={(p) => onEvidenceChange('nameBoard', p)} />
            <EvidenceUpload label="Factory Site Front View" value={factoryEvidence.frontView} onChange={(p) => onEvidenceChange('frontView', p)} />
            <EvidenceUpload label="Factory Site Route Map" value={factoryEvidence.routeMap} onChange={(p) => onEvidenceChange('routeMap', p)} />
          </View>

          {/* Group 2: Warehouse — only when the warehouse address differs */}
          {!isSameAsWarehouse && (
            <View style={{ rowGap: 16 }}>
              <View className="flex-row items-center" style={{ columnGap: 6 }}>
                <MapPin size={16} color="#e01a1b" />
                <Text className="text-sm font-bold text-slate-700">Warehouse — Photo Evidence</Text>
              </View>
              <EvidenceUpload label="Warehouse Name Board" value={factoryEvidence.warehouseNameBoard} onChange={(p) => onEvidenceChange('warehouseNameBoard', p)} />
              <EvidenceUpload label="Warehouse Front View" value={factoryEvidence.warehouseFrontView} onChange={(p) => onEvidenceChange('warehouseFrontView', p)} />
              <EvidenceUpload label="Warehouse Route Map" value={factoryEvidence.warehouseRouteMap} onChange={(p) => onEvidenceChange('warehouseRouteMap', p)} />
            </View>
          )}
        </View>
      </SectionBlock>
    </View>
  );
}