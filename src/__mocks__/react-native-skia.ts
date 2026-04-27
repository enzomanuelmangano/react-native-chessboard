// Mock for @shopify/react-native-skia
import React from 'react';

export const Canvas = ({ children }: { children?: React.ReactNode }) => children;
export const Group = ({ children }: { children?: React.ReactNode }) => children;
export const Rect = () => null;
export const Circle = () => null;
export const Image = () => null;

export const useImage = () => null;

export default {
  Canvas,
  Group,
  Rect,
  Circle,
  Image,
  useImage,
};
