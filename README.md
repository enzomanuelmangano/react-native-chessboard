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

- [react-native-reanimated (>= 4.0.0)](https://docs.swmansion.com/react-native-reanimated/docs)
- [react-native-gesture-handler (>= 2.14.0)](https://docs.swmansion.com/react-native-gesture-handler/docs/)
- [@shopify/react-native-skia (>= 2.0.0)](https://shopify.github.io/react-native-skia/)
- [react-native-worklets (>= 0.7.0)](https://docs.swmansion.com/react-native-worklets/docs/)

Requires React Native 0.79+ (New Architecture) and React 19 — the floors set by Skia 2 and Reanimated 4.

```sh
bun add react-native-chessboard
```

or with npm:

```sh
npm install react-native-chessboard
```

## Usage

The board uses react-native-gesture-handler, so the app (or at least the subtree containing the board) must be wrapped in `GestureHandlerRootView`:

```jsx
import Chessboard from 'react-native-chessboard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Chessboard />
    </View>
  </GestureHandlerRootView>
);
```

## Properties

### `gestureEnabled?: boolean`

Enables gestures for chess pieces.

Default: `true`

---

### `fen?: string`

Indicates the initial FEN position of the chessboard. The board rebuilds when this prop changes.

---

### `flipped?: boolean`

Renders the board from Black's perspective — pieces, coordinate labels, and gestures all follow the orientation.

Default: `false`

```jsx
<Chessboard flipped />
```

---

### `withLetters?: boolean`

Shows the letters on the bottom horizontal axis of the chessboard.

Default: `true`

---

### `withNumbers?: boolean`

Shows the numbers on the left vertical axis of the chessboard.

Default: `true`

---

### `fontSource?: ImageSourcePropType`

Optional font asset for the letter and number labels (e.g. `require('./Inter.ttf')`). Falls back to the platform system font when omitted.

```jsx
<Chessboard fontSource={require('./assets/Inter.ttf')} />
```

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

The callback receives `{ move, state }` — `move` is the verbose chess.js `Move` that was just played (`from`, `to`, `san`, `color`, `captured`, …).

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
- `history: ReadonlyArray<Move>` — verbose move history (each entry includes `from`, `to`, `san`, `color`, `promotion`, captured piece, etc.). Useful for replay, move-list UIs, and analysis.

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

### `onIllegalMove?: (from: Square, to: Square) => void`

Callback executed when a gesture attempts an illegal move (the piece snaps back).

---

### `renderEffect?: (params: EffectParams) => React.ReactNode`

Render a custom overlay (e.g. a Skia shader) driven by game events. `params` exposes shared values — `centerX`/`centerY` (the relevant king's position), `progress` (0 → 1 when the effect triggers), `trigger` (`'check' | 'checkmate' | 'stalemate' | ''`) — plus `boardSize`.

---

### `spriteSource?: ImageSourcePropType`

Override the bundled piece sprite sheet with your own. Falls back to the default sheet when omitted.

```jsx
<Chessboard spriteSource={require('./assets/my-pieces.png')} />
```

The sheet must follow the standard layout the library expects:

- 6×2 grid (12 cells total)
- Each cell is **128×128 pixels**
- **Row 0:** white pieces in order `p, n, b, r, q, k`
- **Row 1:** black pieces in same order

```
col:  0(p)  1(n)  2(b)  3(r)  4(q)  5(k)
row 0: wp    wn    wb    wr    wq    wk    ← white
row 1: bp    bn    bb    br    bq    bk    ← black
total: 768 × 256
```

Any `ImageSourcePropType` is accepted: `require(...)`, `{ uri }`, etc.

#### Generating a sheet from individual piece images

If you only have 12 individual PNGs (one per piece) and need to compose them into a single sheet, the library ships a CLI for that:

```sh
npx react-native-chessboard-generate-sprite \
  --input ./my-pieces \
  --output ./assets/my-sprite.png
```

The input directory must contain these files:

```
wp.png wn.png wb.png wr.png wq.png wk.png
bp.png bn.png bb.png br.png bq.png bk.png
```

Options:

- `--input <dir>` — directory holding the 12 PNGs
- `--output <path>` — output sheet path
- `--cell-size=<n>` — cell size in pixels (default `128`)

The script depends on [`sharp`](https://www.npmjs.com/package/sharp); install it first if you don't already have it:

```sh
npm install --save-dev sharp
```

Then point `spriteSource` at the generated file:

```jsx
<Chessboard spriteSource={require('./assets/my-sprite.png')} />
```

---

## Ref API

The chessboard exposes a ref for programmatic control:

```tsx
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

const App = () => {
  const chessboardRef = useRef<ChessboardRef>(null);

  useEffect(() => {
    (async () => {
      await chessboardRef.current?.move({ from: 'e2', to: 'e4' });
      await chessboardRef.current?.move({ from: 'e7', to: 'e5' });
      await chessboardRef.current?.move({ from: 'g1', to: 'f3' });
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Chessboard ref={chessboardRef} />
    </View>
  );
};
```

### `move({ from: Square; to: Square; promotion?: PieceSymbol }): Promise<Move | undefined>`

Moves a piece programmatically. Pass `promotion` (`'q' | 'r' | 'b' | 'n'`) to resolve pawn promotions without showing the picker dialog.

The Promise resolves **when the piece animation has settled** (or immediately with `undefined` for an invalid move), so awaited sequences play back cleanly:

```tsx
await ref.current?.move({ from: 'e2', to: 'e4' }); // resolves after the piece lands
```

### `undo(): Move | null`

Undoes the last move. Returns the undone move or null if no moves to undo.

### `highlight({ square: Square; color?: string }): void`

Highlights a square. Default color is `'rgba(255,255,0, 0.5)'`.

### `resetAllHighlightedSquares(): void`

Clears all highlighted squares.

### `resetBoard(fen?: string, opts?): void`

Resets the board. Optionally loads a new FEN position.

`opts` enables animated history navigation when stepping between positions:

- `slide?: { from: Square; to: Square }` — animates the piece that ends on `to` sliding in from `from`, instead of snapping the whole board
- `lastMove?: { from: Square; to: Square } | null` — squares to highlight as the move that produced this position

```tsx
// step forward through a stored game
ref.current?.resetBoard(nextFen, {
  slide: { from: move.from, to: move.to },
  lastMove: { from: move.from, to: move.to },
});
```

### `getState(): ChessboardState`

Returns the current state of the chessboard.

---

## Migration from v1.x

### Breaking Changes

1. **New peer dependencies**: `@shopify/react-native-skia >= 2.0.0`, `react-native-worklets >= 0.7.0`
2. **Minimum versions**: React Native 0.79+ (New Architecture), React 19, Reanimated 4+
3. **State API changes** (chess.js v1.0):

   - `in_check` → `isCheck`
   - `in_checkmate` → `isCheckmate`
   - `in_draw` → `isDraw`
   - `in_stalemate` → `isStalemate`
   - `in_threefold_repetition` → `isThreefoldRepetition`
   - `insufficient_material` → `isInsufficientMaterial`
   - `game_over` → `isGameOver`
   - `in_promotion` → `isPromotion`

4. **`renderPiece` prop removed**: Per-piece JSX rendering is no longer supported in v2.0. Use `spriteSource` to swap the entire piece set instead (see above).

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
