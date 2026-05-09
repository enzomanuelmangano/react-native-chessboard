<h1 align="center">
React Native Chessboard
</h1>

A high-performing, zero-render chessboard for React Native built with Skia and Reanimated.

<div align="center">
    <img src="https://github.com/enzomanuelmangano/react-native-chessboard/blob/main/.assets/chessboard.gif" title="react-native-chessboard">
</div>

## Features

- **Zero React re-renders** - All animations and updates happen via shared values
- **60fps gesture performance** - Smooth drag and drop with react-native-gesture-handler
- **Skia rendering** - Hardware-accelerated graphics with @shopify/react-native-skia
- **Full chess support** - Castling, en passant, pawn promotion
- **Programmatic control** - Move pieces, undo, reset, and highlight via ref API

## Installation

**Required peer dependencies:**

- [react-native-reanimated (>= 3.6.0)](https://docs.swmansion.com/react-native-reanimated/docs)
- [react-native-gesture-handler (>= 2.14.0)](https://docs.swmansion.com/react-native-gesture-handler/docs/)
- [@shopify/react-native-skia (>= 1.0.0)](https://shopify.github.io/react-native-skia/)

```sh
bun add react-native-chessboard
```

or with npm:

```sh
npm install react-native-chessboard
```

## Usage

```jsx
import Chessboard from 'react-native-chessboard';

const App = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Chessboard />
  </View>
);
```

## Properties

### `gestureEnabled?: boolean`

Enables gestures for chess pieces.

Default: `true`

---

### `fen?: string`

Indicates the initial FEN position of the chessboard.

---

### `withLetters?: boolean`

Shows the letters on the bottom horizontal axis of the chessboard.

Default: `true`

---

### `withNumbers?: boolean`

Shows the numbers on the left vertical axis of the chessboard.

Default: `true`

---

### `boardSize?: number`

Indicates the chessboard width and height.

Default: `Math.floor(SCREEN_WIDTH / 8) * 8`

---

### `onMove?: (info: MoveResult) => void;`

Callback executed after a move is made.

```jsx
import Chessboard from 'react-native-chessboard';

const App = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Chessboard
      onMove={({ state }) => {
        if (state.isCheckmate) {
          console.log('Checkmate!');
        }
      }}
    />
  </View>
);
```

The `state` object contains:

- `isCheck: boolean`
- `isCheckmate: boolean`
- `isDraw: boolean`
- `isStalemate: boolean`
- `isThreefoldRepetition: boolean`
- `isInsufficientMaterial: boolean`
- `isGameOver: boolean`
- `isPromotion: boolean`
- `fen: string`

---

### `colors?: ChessboardColorsType`

Customize the default colors used in the chessboard.

Default:

- black: `'#62B1A8'`
- white: `'#D9FDF8'`
- lastMoveHighlight: `'rgba(255,255,0, 0.5)'`
- checkmateHighlight: `'#E84855'`
- promotionPieceButton: `'#FF9B71'`

---

### `durations?: { move?: number }`

Customize animation durations (in milliseconds).

Default:

- move: `150`

---

## Ref API

The chessboard exposes a ref for programmatic control:

```jsx
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

const App = () => {
  const chessboardRef = useRef < ChessboardRef > null;

  useEffect(() => {
    (async () => {
      await chessboardRef.current?.move({ from: 'e2', to: 'e4' });
      await chessboardRef.current?.move({ from: 'e7', to: 'e5' });
      await chessboardRef.current?.move({ from: 'g1', to: 'f3' });
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Chessboard ref={chessboardRef} durations={{ move: 500 }} />
    </View>
  );
};
```

### `move({ from: Square; to: Square }): Promise<Move | undefined>`

Moves a piece programmatically. Returns a Promise that resolves to the Move object or undefined if invalid.

### `undo(): Move | null`

Undoes the last move. Returns the undone move or null if no moves to undo.

### `highlight({ square: Square; color?: string }): void`

Highlights a square. Default color is `'rgba(255,255,0, 0.5)'`.

### `resetAllHighlightedSquares(): void`

Clears all highlighted squares.

### `resetBoard(fen?: string): void`

Resets the board. Optionally loads a new FEN position.

### `getState(): ChessboardState`

Returns the current state of the chessboard.

---

## Migration from v1.x

### Breaking Changes

1. **New peer dependency**: `@shopify/react-native-skia >= 1.0.0`
2. **Minimum versions**: React Native 0.71+, Reanimated 3.6+
3. **State API changes** (chess.js v1.0):

   - `in_check` → `isCheck`
   - `in_checkmate` → `isCheckmate`
   - `in_draw` → `isDraw`
   - `in_stalemate` → `isStalemate`
   - `in_threefold_repetition` → `isThreefoldRepetition`
   - `insufficient_material` → `isInsufficientMaterial`
   - `game_over` → `isGameOver`
   - `in_promotion` → `isPromotion`

4. **`renderPiece` prop removed**: Custom piece rendering is no longer supported in v2.0

### Migration Steps

1. Install the new peer dependency:

```sh
bun add @shopify/react-native-skia
```

2. Update your `onMove` callbacks to use the new state property names:

```jsx
// Before (v1.x)
onMove={({ state }) => {
  if (state.in_checkmate) { /* ... */ }
}}

// After (v2.0)
onMove={({ state }) => {
  if (state.isCheckmate) { /* ... */ }
}}
```

---

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
