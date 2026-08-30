import React from 'react';
import { useFont } from '@shopify/react-native-skia';
import { BoardBackground } from '../components/skia/board-background';
import {
  MOVE_SPRING,
  SCALE_SPRING,
  SNAP_BACK_SPRING,
} from '../config/animations';
import type { BoardConfig } from '../state/types';
import { findAllByType, renderToTree } from './render-utils';

const useFontMock = useFont as jest.Mock;

const baseConfig = (overrides: Partial<BoardConfig> = {}): BoardConfig => ({
  boardSize: 400,
  pieceSize: 50,
  gestureEnabled: true,
  flipped: false,
  withLetters: true,
  withNumbers: true,
  colors: {
    white: '#fff',
    black: '#000',
    lastMoveHighlight: 'rgba(255,255,0,0.5)',
    checkmateHighlight: '#E84855',
    selectedHighlight: 'rgba(20,120,20,0.35)',
    promotionPieceButton: '#FF9B71',
  },
  animations: {
    move: MOVE_SPRING,
    scale: SCALE_SPRING,
    snapBack: SNAP_BACK_SPRING,
  },
  fontSource: null,
  ...overrides,
});

const labelTexts = (config: BoardConfig): string[] =>
  findAllByType(renderToTree(<BoardBackground config={config} />), 'skia-text')
    .map((node) => (node.props as { text: string }).text)
    .sort();

describe('BoardBackground labels', () => {
  beforeEach(() => {
    useFontMock.mockClear();
    // No custom font source by default; useFont(null, ...) returns null in
    // production, so the component falls back to matchFont (system font).
    useFontMock.mockReturnValue(null);
  });

  it('paints 8 column letters when withLetters=true and withNumbers=false', () => {
    const texts = labelTexts(
      baseConfig({ withLetters: true, withNumbers: false })
    );
    expect(texts).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('paints 8 row numbers when withLetters=false and withNumbers=true', () => {
    const texts = labelTexts(
      baseConfig({ withLetters: false, withNumbers: true })
    );
    expect(texts).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('paints all 16 labels when both flags are true', () => {
    const texts = labelTexts(
      baseConfig({ withLetters: true, withNumbers: true })
    );
    expect(texts).toHaveLength(16);
  });

  it('paints zero labels when both flags are false', () => {
    const texts = labelTexts(
      baseConfig({ withLetters: false, withNumbers: false })
    );
    expect(texts).toHaveLength(0);
  });

  it('reverses letters when flipped=true', () => {
    // squares are pushed in row-major order; after sorting we lose order
    // information, so check the unsorted list at row 7 directly.
    const tree = renderToTree(
      <BoardBackground
        config={baseConfig({ flipped: true, withNumbers: false })}
      />
    );
    const texts = findAllByType(tree, 'skia-text').map(
      (node) => (node.props as { text: string }).text
    );
    expect(texts).toEqual(['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']);
  });

  it('reverses numbers when flipped=true', () => {
    const tree = renderToTree(
      <BoardBackground
        config={baseConfig({ flipped: true, withLetters: false })}
      />
    );
    // Row labels render once per row (col === 0), so they appear in row order.
    const texts = findAllByType(tree, 'skia-text').map(
      (node) => (node.props as { text: string }).text
    );
    expect(texts).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('forwards a custom fontSource to useFont', () => {
    const customSource = require('../assets/pieces-sprite.png');
    renderToTree(
      <BoardBackground
        config={baseConfig({ fontSource: customSource, withNumbers: false })}
      />
    );

    expect(useFontMock).toHaveBeenCalled();
    expect(useFontMock.mock.calls[0][0]).toBe(customSource);
  });

  it('passes null to useFont when no fontSource is provided', () => {
    renderToTree(<BoardBackground config={baseConfig()} />);

    expect(useFontMock).toHaveBeenCalled();
    expect(useFontMock.mock.calls[0][0]).toBeNull();
  });

  it('still paints labels when useFont returns null (system font fallback)', () => {
    useFontMock.mockReturnValue(null);
    const texts = labelTexts(baseConfig({ withNumbers: false }));
    expect(texts).toHaveLength(8);
  });
});
