<h1 align="center">
👉🏼 React Native Chessboard
</h1>

A lightweight, simple, and high-performing chessboard for React Native. 

Deeply inspired by the [Chess Youtube Episode](https://youtu.be/JulJJxbP_T0) from the series ["Can it be done in React Native?"](https://github.com/wcandillon/can-it-be-done-in-react-native) made by [William Candillon](https://github.com/wcandillon).

<div align="center">
    <img src="https://github.com/enzomanuelmangano/react-native-chessboard/blob/main/.assets/chessboard_image.png" title="react-native-chessboard">
</div>

## Disclaimer 

If you want this package in production, use it with caution.

## Installation

**You need to have already installed the following packages:**

- [react-native-reanimated (>= 2.3.0)](https://docs.swmansion.com/react-native-reanimated/docs)
- [react-native-gesture-handler (>= 2.0.0)](https://docs.swmansion.com/react-native-gesture-handler/docs/)

Open a Terminal in your project's folder and install the library using `yarn`:

```sh
yarn add react-native-chessboard
```

or with `npm`:

```sh
npm install react-native-chessboard
```

## Usage

```jsx
import Chessboard from 'react-native-chessboard';

const App = () => (
  <View
    style={{
        flex: 1, 
        alignItems: 'center',
        justifyContent: 'center'
    }}
  >
    <Chessboard/>
  </View>
);
```

## Properties

### `gestureEnabled?: boolean`

Enables gestures for chess pieces.

Default: `true`

---

### `fen?: string`

Indicates the initial fen position of the chessboard.

---

### `withLetters?: boolean`

Decides whether or not to show the letters on the bottom horizontal axis of the chessboard.

Default: `true`

---

### `withNumbers?: boolean`

Decides whether or not to show the numbers on the left vertical axis of the chessboard.

Default: `true`

---

### `boardSize?: number`

Indicates the chessboard width and height.

Default: `Math.floor(SCREEN_WIDTH / 8) * 8`

---

### `renderPiece?: (piece: PieceType) => React.ReactElement | null`

It gives the possibility to customise the chessboard pieces.

In detail, it takes a PieceType as input, which is constructed as follows: 

```ts
type Player = 'b' | 'w';
type Type = 'q' | 'r' | 'n' | 'b' | 'k' | 'p';
type PieceType = `${Player}${Type}`;
```

---

### `onMove?: (info: ChessMoveInfo) => void;`

It's a particularly useful callback if you want to execute an instruction after a move. 

```jsx
import Chessboard from 'react-native-chessboard';

const App = () => (
  <View
    style={{
        flex: 1, 
        alignItems: 'center',
        justifyContent: 'center'
    }}
  >
    <Chessboard
        onMove={({ state }) => {
          if (state.in_checkmate) {
            console.log('Life goes on.');
          }
        }}
      />
  </View>
);
```

In detail, you can access these parameters: 
- `in_check: boolean`
- `in_checkmate: boolean`
- `in_draw: boolean`
- `in_stalemate: boolean`
- `in_threefold_repetition: boolean`
- `insufficient_material: boolean`
- `game_over: boolean`
- `fen: boolean`

P.S: These parameters are the outputs given by the respective functions used by chess.js (on which the package is built).

---

### `colors?: ChessboardColorsType` 

Useful if you want to customise the default colors used in the chessboard. 

Default: 
- black: `'#62B1A8'`
- white: `'#D9FDF8'`
- lastMoveHighlight: `'rgba(255,255,0, 0.5)'`
- checkmateHighlight: `'#E84855'`
- promotionPieceButton: `'#FF9B71'`

---

### `durations?: { move?: number }`

Useful if you want to customise the default durations used in the chessboard (in milliseconds). 

Default: 
- move: `150`

---

## What if I want to move pieces around without gestures?

Fortunately, the package provides the possibility of passing a React Ref to the component. 

The operations granted are:

### `move: ({ from: Square; to: Square; }) => Promise<Move | undefined> | undefined;`

Very useful if you want to move the pieces on the chessboard programmatically.

```jsx
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

const App = () => {
  const chessboardRef = useRef<ChessboardRef>(null);

  useEffect(() => {
    (async () => {
      await chessboardRef.current?.move({ from: 'e2', to: 'e4' });
      await chessboardRef.current?.move({ from: 'e7', to: 'e5' });
      await chessboardRef.current?.move({ from: 'd1', to: 'f3' });
      await chessboardRef.current?.move({ from: 'a7', to: 'a6' });
      await chessboardRef.current?.move({ from: 'f1', to: 'c4' });
      await chessboardRef.current?.move({ from: 'a6', to: 'a5' });
      await chessboardRef.current?.move({ from: 'f3', to: 'f7' });
    })();
  }, []);

  return (
      <View
        style={{
            flex: 1, 
            alignItems: 'center',
            justifyContent: 'center'
        }}
    >
        <Chessboard
            ref={chessboardRef}
            durations={{ move: 1000 }}
        />
    </View>
  )
};
```

---

### `highlight: (_: { square: Square; color?: string }) => void;`

Highlight a square on the chessboard. The default color is `'rgba(255,255,0, 0.5)'`. 

---

### `resetAllHighlightedSquares: () => void`

---

### `resetBoard: (fen?: string) => void;`

Resets the chessboard from a fen position. 

---

### `getState: () => ChessboardState;`

Returns the current state of the chessboard (which can also be retrieved using the onMove callback).

---

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT