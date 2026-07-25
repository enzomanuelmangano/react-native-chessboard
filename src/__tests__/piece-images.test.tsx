import React from 'react';
import { act, create } from 'react-test-renderer';
import { Skia, useImage } from '@shopify/react-native-skia';
import {
  preloadPieceSpriteSheet,
  usePieceSpriteSheet,
} from '../assets/piece-images';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const useImageMock = useImage as jest.Mock;
const fromURIMock = Skia.Data.fromURI as jest.Mock;
const makeImageMock = Skia.Image.MakeImageFromEncoded as jest.Mock;

type HookResult = ReturnType<typeof usePieceSpriteSheet>;

/**
 * The hook uses `useEffect` to populate the cache, so it has to run inside a
 * real render rather than being called bare.
 */
const renderHook = (source?: Parameters<typeof usePieceSpriteSheet>[0]) => {
  const results: HookResult[] = [];
  const Probe = () => {
    results.push(usePieceSpriteSheet(source));
    return null;
  };
  act(() => {
    create(<Probe />);
  });
  return {
    first: results[0],
    last: results[results.length - 1],
    renders: results.length,
  };
};

// Each URI is distinct so cases cannot leak cache entries into each other —
// the cache is module-level and deliberately lives for the app's lifetime.
let uriCounter = 0;
const uniqueSource = () => ({
  uri: `https://example.com/sprite-${(uriCounter += 1)}.png`,
});

describe('usePieceSpriteSheet', () => {
  beforeEach(() => {
    useImageMock.mockClear();
    useImageMock.mockReturnValue(null);
    fromURIMock.mockClear();
    makeImageMock.mockClear();
  });

  it('forwards the bundled sprite source to useImage when no override is given', () => {
    renderHook();

    expect(useImageMock).toHaveBeenCalled();
    expect(useImageMock.mock.calls[0][0]).toBeDefined();
  });

  it('forwards a custom uri source verbatim', () => {
    const source = uniqueSource();
    renderHook(source);

    expect(useImageMock).toHaveBeenCalledWith(source);
  });

  it('returns the SkImage produced by useImage', () => {
    const fakeSkImage = { __brand: 'SkImage' } as unknown;
    useImageMock.mockReturnValue(fakeSkImage);

    const { first } = renderHook(uniqueSource());

    expect(first.image).toBe(fakeSkImage);
  });

  it('returns null while the image is decoding', () => {
    useImageMock.mockReturnValue(null);

    const { first } = renderHook(uniqueSource());

    expect(first.image).toBeNull();
    expect(first.wasCached).toBe(false);
  });

  it('serves a second board from cache without decoding again', () => {
    const source = uniqueSource();
    const fakeSkImage = { __brand: 'SkImage' } as unknown;
    useImageMock.mockReturnValue(fakeSkImage);

    // First board pays for the decode and fills the cache on commit.
    const first = renderHook(source);
    expect(first.first.wasCached).toBe(false);

    useImageMock.mockClear();

    // Second board gets the sheet synchronously on its very first render.
    const second = renderHook(source);
    expect(second.first.wasCached).toBe(true);
    expect(second.first.image).toBe(fakeSkImage);
    // `null` is passed so useImage skips the decode entirely.
    expect(useImageMock).toHaveBeenCalledWith(null);
  });

  it('keys the cache by source, so a different sheet still decodes', () => {
    const shared = { __brand: 'SkImage' } as unknown;
    useImageMock.mockReturnValue(shared);

    renderHook(uniqueSource());
    const other = renderHook(uniqueSource());

    expect(other.first.wasCached).toBe(false);
  });
});

describe('preloadPieceSpriteSheet', () => {
  beforeEach(() => {
    useImageMock.mockClear();
    useImageMock.mockReturnValue(null);
    fromURIMock.mockClear();
    makeImageMock.mockClear();
  });

  it('decodes a sheet and lets a later board render it on the first frame', async () => {
    const source = uniqueSource();

    const preloaded = await preloadPieceSpriteSheet(source);
    expect(preloaded).not.toBeNull();
    expect(fromURIMock).toHaveBeenCalledWith(source.uri);

    // useImage keeps returning null: without the cache the board would be
    // pieceless on its first frame.
    const { first } = renderHook(source);
    expect(first.wasCached).toBe(true);
    expect(first.image).toBe(preloaded);
  });

  it('is idempotent — a second call reuses the decoded sheet', async () => {
    const source = uniqueSource();

    const one = await preloadPieceSpriteSheet(source);
    fromURIMock.mockClear();
    const two = await preloadPieceSpriteSheet(source);

    expect(two).toBe(one);
    expect(fromURIMock).not.toHaveBeenCalled();
  });

  it('resolves null when the sheet cannot be decoded', async () => {
    makeImageMock.mockReturnValueOnce(null);

    const result = await preloadPieceSpriteSheet(uniqueSource());

    expect(result).toBeNull();
  });

  it('resolves null for a source with no resolvable uri', async () => {
    const result = await preloadPieceSpriteSheet(
      [] as unknown as Parameters<typeof preloadPieceSpriteSheet>[0]
    );

    expect(result).toBeNull();
    expect(fromURIMock).not.toHaveBeenCalled();
  });
});
