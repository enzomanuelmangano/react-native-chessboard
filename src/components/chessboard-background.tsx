/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useChessboardProps } from '../context/props-context/hooks';

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
    const { colors } = useChessboardProps();
    const backgroundColor = white ? colors.black : colors.white;
    const textStyle = {
      fontWeight: '400' as const,
      fontSize: 8,
      color: colors.text,
    };
    const newLocal = col === 0;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor,
          padding: 2,
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
            {String.fromCharCode(97 + col).toUpperCase()}
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

const Background: React.FC = React.memo(() => {
  const { withLetters, withNumbers } = useChessboardProps();
  return (
    <View style={{ flex: 1 }}>
      {new Array(8).fill(0).map((_, i) => (
        <Row
          key={i}
          white={i % 2 === 0}
          row={i}
          letters={withLetters}
          numbers={withNumbers}
        />
      ))}
    </View>
  );
});

export default Background;
