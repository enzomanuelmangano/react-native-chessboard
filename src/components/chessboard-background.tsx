/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const WHITE = '#62B1A8';
const BLACK = '#D9FDF8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
});

type BackgroundProps = {
  letters: boolean;
  numbers: boolean;
};

interface BaseProps extends BackgroundProps {
  white: boolean;
}

interface RowProps extends BaseProps {
  row: number;
}

interface SquareProps extends RowProps {
  col: number;
}

const Square = React.memo(
  ({ white, row, col, letters, numbers }: SquareProps) => {
    const backgroundColor = white ? WHITE : BLACK;
    const color = white ? BLACK : WHITE;
    const textStyle = { fontWeight: '500' as const, fontSize: 10, color };
    const newLocal = col === 0;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor,
          padding: 4,
          justifyContent: 'space-between',
        }}
      >
        {numbers && (
          <Text style={[textStyle, { opacity: newLocal ? 1 : 0 }]}>
            {'' + (8 - row)}
          </Text>
        )}
        {row === 7 && letters && (
          <Text style={[textStyle, { alignSelf: 'flex-end' }]}>
            {String.fromCharCode(97 + col)}
          </Text>
        )}
      </View>
    );
  }
);

const Row = React.memo(({ white, row, ...rest }: RowProps) => {
  const offset = white ? 0 : 1;
  return (
    <View style={styles.container}>
      {new Array(8).fill(0).map((_, i) => (
        <Square
          {...rest}
          row={row}
          col={i}
          key={i}
          white={(i + offset) % 2 === 1}
        />
      ))}
    </View>
  );
});

const Background: React.FC<Partial<BackgroundProps>> = React.memo(
  ({ letters = true, numbers = true }) => {
    return (
      <View style={{ flex: 1 }}>
        {new Array(8).fill(0).map((_, i) => (
          <Row
            key={i}
            white={i % 2 === 0}
            row={i}
            letters={letters}
            numbers={numbers}
          />
        ))}
      </View>
    );
  }
);

export default Background;
