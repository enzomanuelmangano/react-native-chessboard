import React, { useMemo } from 'react';
import {
  Group,
  Rect,
  Text,
  matchFont,
  useFont,
} from '@shopify/react-native-skia';
import type { BoardConfig } from '../../state';

const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const COLUMNS_FLIPPED = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
const ROWS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const ROWS_FLIPPED = ['1', '2', '3', '4', '5', '6', '7', '8'];

interface BoardBackgroundProps {
  config: BoardConfig;
}

export const BoardBackground: React.FC<BoardBackgroundProps> = React.memo(
  ({ config }) => {
    const { pieceSize, colors, flipped, withLetters, withNumbers, fontSource } =
      config;

    const fontSize = pieceSize * 0.15;

    // When the consumer ships a custom font asset (e.g. require('./Inter.ttf'))
    // useFont decodes it asynchronously and may briefly return null on the
    // first render. matchFont is synchronous and uses the platform's system
    // font; that's the default fallback so labels paint immediately.
    // useFont's first arg is DataSourceParam (skia-internal type); the public
    // prop accepts ImageSourcePropType. Cast at the boundary; runtime accepts
    // both shapes (require id, { uri }, raw bytes).
    const customFont = useFont(
      fontSource as Parameters<typeof useFont>[0],
      fontSize
    );
    const systemFont = useMemo(
      () => matchFont({ fontSize, fontFamily: 'System' }),
      [fontSize]
    );
    const font = customFont ?? systemFont;

    const columns = flipped ? COLUMNS_FLIPPED : COLUMNS;
    const rows = flipped ? ROWS_FLIPPED : ROWS;

    const squares: React.ReactElement[] = [];
    const labels: React.ReactElement[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = col * pieceSize;
        const y = row * pieceSize;

        squares.push(
          <Rect
            key={`${col}-${row}`}
            x={x}
            y={y}
            width={pieceSize}
            height={pieceSize}
            color={isLight ? colors.white : colors.black}
          />
        );

        if (withLetters && row === 7) {
          const labelColor = isLight ? colors.black : colors.white;
          labels.push(
            <Text
              key={`col-${col}`}
              x={x + pieceSize - pieceSize * 0.15}
              y={y + pieceSize - pieceSize * 0.05}
              text={columns[col]}
              font={font}
              color={labelColor}
            />
          );
        }

        if (withNumbers && col === 0) {
          const labelColor = isLight ? colors.black : colors.white;
          labels.push(
            <Text
              key={`row-${row}`}
              x={x + pieceSize * 0.05}
              y={y + pieceSize * 0.18}
              text={rows[row]}
              font={font}
              color={labelColor}
            />
          );
        }
      }
    }

    return (
      <Group>
        {squares}
        {labels}
      </Group>
    );
  }
);

BoardBackground.displayName = 'BoardBackground';
