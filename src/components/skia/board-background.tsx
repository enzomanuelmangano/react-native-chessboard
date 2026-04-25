import React from 'react';
import { Group, Rect, Text, useFont } from '@shopify/react-native-skia';
import { useBoardConfig } from '../../state';

const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROWS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const BoardBackground: React.FC = React.memo(() => {
  const { pieceSize, colors, withLetters, withNumbers } = useBoardConfig();

  const font = useFont(null, pieceSize * 0.15);

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

      // Add column labels on bottom row
      if (withLetters && row === 7 && font) {
        const labelColor = isLight ? colors.black : colors.white;
        labels.push(
          <Text
            key={`col-${col}`}
            x={x + pieceSize - pieceSize * 0.15}
            y={y + pieceSize - pieceSize * 0.05}
            text={COLUMNS[col]}
            font={font}
            color={labelColor}
          />
        );
      }

      // Add row labels on left column
      if (withNumbers && col === 0 && font) {
        const labelColor = isLight ? colors.black : colors.white;
        labels.push(
          <Text
            key={`row-${row}`}
            x={x + pieceSize * 0.05}
            y={y + pieceSize * 0.18}
            text={ROWS[row]}
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
});

BoardBackground.displayName = 'BoardBackground';
