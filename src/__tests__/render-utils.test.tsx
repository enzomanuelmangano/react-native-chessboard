import React from 'react';
import {
  Canvas,
  Group,
  Rect,
  Text,
  matchFont,
  useFont,
} from '@shopify/react-native-skia';
import { findAllByType, renderToTree } from './render-utils';

describe('render-utils + skia mock', () => {
  it('renders the host elements emitted by the skia mock', () => {
    const tree = renderToTree(
      <Canvas>
        <Group>
          <Rect x={0} y={0} width={10} height={10} />
          <Text x={0} y={0} text="hello" font={matchFont({ fontSize: 12 })} />
        </Group>
      </Canvas>
    );

    expect(tree.type).toBe('skia-canvas');
    expect(findAllByType(tree, 'skia-rect')).toHaveLength(1);
    expect(findAllByType(tree, 'skia-text')).toHaveLength(1);
    expect(findAllByType(tree, 'skia-text')[0]).toMatchObject({
      props: { text: 'hello' },
    });
  });

  it('exposes truthy SkFont stubs from useFont and matchFont', () => {
    expect(useFont(null, 12)).toMatchObject({ __mock: 'SkFont' });
    expect(matchFont({ fontSize: 12 })).toMatchObject({ __mock: 'SkFont' });
  });
});
