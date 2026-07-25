// Mock for @shopify/react-native-skia.
//
// This mock intentionally diverges from the real package in two ways:
//
// 1. Drawing primitives (Canvas, Group, Rect, Image, Atlas, Text, etc.) render
//    as host elements with stable type names like "skia-canvas". The real
//    package routes them through the Skia drawing graph; here they exist only
//    so react-test-renderer can produce an introspectable JSON tree. Look up
//    rendered output by `type === 'skia-text'` etc.
// 2. Async loaders (useImage, useFont, useTypeface) are jest.fn()s with
//    sensible defaults but no real loading. matchFont returns a truthy stub
//    synchronously, mirroring the real synchronous API.
//
// Tests that need to override defaults can do so per-test:
//   (useImage as jest.Mock).mockReturnValueOnce(fakeSkImage);
import React from 'react';

const host = (name: string) => {
  const Component = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement(name, props, children);
  Component.displayName = name;
  return Component;
};

export const Canvas = host('skia-canvas');
export const Group = host('skia-group');
export const Rect = host('skia-rect');
export const Circle = host('skia-circle');
export const Image = host('skia-image');
export const Atlas = host('skia-atlas');
export const Text = host('skia-text');
export const Path = host('skia-path');
export const Paint = host('skia-paint');
export const Fill = host('skia-fill');
export const Shadow = host('skia-shadow');
export const RuntimeShader = host('skia-runtime-shader');

const fakeSkFont = {
  __mock: 'SkFont',
  measureText: () => ({ width: 0, height: 0 }),
  getSize: () => 12,
};

export const useImage = jest.fn(() => null);
export const useFont = jest.fn(() => fakeSkFont);
export const useTypeface = jest.fn(() => ({ __mock: 'SkTypeface' }));
export const matchFont = jest.fn(() => fakeSkFont);

export const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

export const Skia = {
  RSXform: (scos: number, ssin: number, tx: number, ty: number) => ({
    scos,
    ssin,
    tx,
    ty,
  }),
  RuntimeEffect: {
    Make: () => null,
  },
  Path: {
    // Records the circles the dots layer adds so tests can assert on them.
    Make: () => {
      const circles: Array<{ x: number; y: number; radius: number }> = [];
      return {
        __mock: 'SkPath',
        circles,
        addCircle: (x: number, y: number, radius: number) => {
          circles.push({ x, y, radius });
        },
      };
    },
  },
};

export default {
  Canvas,
  Group,
  Rect,
  Circle,
  Image,
  Atlas,
  Text,
  Path,
  Paint,
  Fill,
  Shadow,
  RuntimeShader,
  useImage,
  useFont,
  useTypeface,
  matchFont,
  rect,
  Skia,
};
