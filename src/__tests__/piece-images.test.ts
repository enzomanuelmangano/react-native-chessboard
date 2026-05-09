import { useImage } from '@shopify/react-native-skia';
import { usePieceSpriteSheet } from '../assets/piece-images';

const useImageMock = useImage as jest.Mock;

describe('usePieceSpriteSheet', () => {
  beforeEach(() => {
    useImageMock.mockClear();
    useImageMock.mockReturnValue(null);
  });

  it('forwards the bundled sprite source to useImage when no override is given', () => {
    usePieceSpriteSheet();

    expect(useImageMock).toHaveBeenCalledTimes(1);
    const passedSource = useImageMock.mock.calls[0][0];
    // Metro+jest resolve `require('./pieces-sprite.png')` to the file mock.
    // ts-jest re-wraps the default export, so the value is the module object.
    expect(passedSource).toBeDefined();
  });

  it('forwards a custom asset source verbatim', () => {
    const customSource = 999 as const;
    usePieceSpriteSheet(customSource);

    expect(useImageMock).toHaveBeenCalledTimes(1);
    expect(useImageMock).toHaveBeenCalledWith(customSource);
  });

  it('forwards a custom uri source verbatim', () => {
    const customSource = { uri: 'https://example.com/my-sprite.png' };
    usePieceSpriteSheet(customSource);

    expect(useImageMock).toHaveBeenCalledTimes(1);
    expect(useImageMock).toHaveBeenCalledWith(customSource);
  });

  it('returns the SkImage produced by useImage', () => {
    const fakeSkImage = { __brand: 'SkImage' } as unknown;
    useImageMock.mockReturnValueOnce(fakeSkImage);

    const result = usePieceSpriteSheet();

    expect(result.image).toBe(fakeSkImage);
  });

  it('returns null while the image is decoding (useImage returns null)', () => {
    useImageMock.mockReturnValueOnce(null);

    const result = usePieceSpriteSheet();

    expect(result.image).toBeNull();
  });
});
