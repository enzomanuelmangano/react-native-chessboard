// Mock for @shopify/react-native-skia
import React from 'react';

export const Canvas = ({ children }: { children?: React.ReactNode }) =>
  children;
export const Group = ({ children }: { children?: React.ReactNode }) => children;
export const Rect = () => null;
export const Circle = () => null;
export const Image = () => null;
export const Atlas = () => null;

export const useImage = () => null;

// Utility function to create SkRect-like objects
export const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

// Mock Skia object
export const Skia = {
  RSXform: (scos: number, ssin: number, tx: number, ty: number) => ({
    scos,
    ssin,
    tx,
    ty,
  }),
};

export default {
  Canvas,
  Group,
  Rect,
  Circle,
  Image,
  Atlas,
  useImage,
  rect,
  Skia,
};
