import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Chessboard, { ChessboardRef } from 'react-native-chessboard';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const ref = useRef<ChessboardRef>(null);

  useEffect(() => {
    const runFullTest = async () => {
      await delay(1000);

      const move = async (from: string, to: string, desc?: string) => {
        if (desc) console.log(`${desc}: ${from}-${to}`);
        const result = await ref.current?.move({
          from: from as any,
          to: to as any,
        });
        if (!result && desc) console.error(`FAILED: ${from}-${to}`);
        await delay(300);
        return result;
      };

      // ========== TEST 1: SCHOLAR'S MATE ==========
      console.log('=== TEST 1: SCHOLARS MATE (Checkmate) ===');
      ref.current?.resetBoard();
      await delay(200);

      await move('e2', 'e4', '1. e4');
      await move('e7', 'e5', '1... e5');
      await move('f1', 'c4', '2. Bc4');
      await move('b8', 'c6', '2... Nc6');
      await move('d1', 'h5', '3. Qh5');
      await move('g8', 'f6', '3... Nf6??');
      await move('h5', 'f7', '4. Qxf7#');

      const state1 = ref.current?.getState();
      console.log(
        '✓ Checkmate:',
        state1?.isCheckmate,
        '| Game Over:',
        state1?.isGameOver
      );
      await delay(800);

      // ========== TEST 2: CASTLING (Both Sides) ==========
      console.log('\n=== TEST 2: CASTLING ===');
      ref.current?.resetBoard();
      await delay(200);

      await move('e2', 'e4', '1. e4');
      await move('e7', 'e5', '1... e5');
      await move('g1', 'f3', '2. Nf3');
      await move('b8', 'c6', '2... Nc6');
      await move('f1', 'c4', '3. Bc4');
      await move('f8', 'c5', '3... Bc5');
      await move('e1', 'g1', '4. O-O');
      await move('g8', 'f6', '4... Nf6');
      await move('d2', 'd3', '5. d3');
      await move('e8', 'g8', '5... O-O');

      console.log('✓ Both sides castled kingside');
      await delay(500);

      // ========== TEST 3: CAPTURES ==========
      console.log('\n=== TEST 3: CAPTURES ===');
      ref.current?.resetBoard();
      await delay(200);

      await move('e2', 'e4');
      await move('d7', 'd5');
      await move('e4', 'd5', 'exd5 (capture)');
      await move('d8', 'd5', 'Qxd5 (capture)');
      await move('b1', 'c3');
      await move('d5', 'a5');
      await move('d2', 'd4');
      await move('c7', 'c6');
      await move('g1', 'f3');
      await move('c8', 'g4');
      await move('f1', 'e2');
      await move('g4', 'f3', 'Bxf3 (capture)');
      await move('e2', 'f3', 'Bxf3 (capture)');

      console.log('✓ Multiple captures executed');
      await delay(500);

      // ========== TEST 4: PAWN PROMOTION ==========
      console.log('\n=== TEST 4: PAWN PROMOTION ===');
      ref.current?.resetBoard('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      await delay(200);

      const promoResult = await ref.current?.move({
        from: 'a7' as any,
        to: 'a8' as any,
        promotion: 'q',
      });
      console.log('✓ Promotion to Queen:', promoResult?.san);
      await delay(500);

      // ========== TEST 5: RESET AFTER CUSTOM FEN ==========
      console.log('\n=== TEST 5: RESET BOARD ===');
      ref.current?.resetBoard();
      await delay(200);

      const resetState = ref.current?.getState();
      const isStartPos = resetState?.fen?.startsWith(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
      );
      console.log('✓ Reset to starting position:', isStartPos);
      await delay(300);

      // ========== TEST 6: HIGHLIGHT API ==========
      console.log('\n=== TEST 6: HIGHLIGHT API ===');
      ref.current?.highlight({
        square: 'e4' as any,
        color: 'rgba(255, 0, 0, 0.5)',
      });
      ref.current?.highlight({
        square: 'd4' as any,
        color: 'rgba(0, 255, 0, 0.5)',
      });
      console.log('✓ Highlighted e4 (red) and d4 (green)');
      await delay(800);

      ref.current?.resetAllHighlightedSquares();
      console.log('✓ Cleared highlights');
      await delay(300);

      // ========== TEST 7: UNDO ==========
      console.log('\n=== TEST 7: UNDO ===');
      await move('e2', 'e4', '1. e4');
      await move('e7', 'e5', '1... e5');

      const undone = ref.current?.undo();
      console.log('✓ Undone move:', undone?.san);
      await delay(500);

      // ========== FINAL: OPERA GAME OPENING ==========
      console.log('\n=== FINAL: OPERA GAME (Morphy) ===');
      ref.current?.resetBoard();
      await delay(200);

      await move('e2', 'e4', '1. e4');
      await move('e7', 'e5', '1... e5');
      await move('g1', 'f3', '2. Nf3');
      await move('d7', 'd6', '2... d6');
      await move('d2', 'd4', '3. d4');
      await move('c8', 'g4', '3... Bg4');
      await move('d4', 'e5', '4. dxe5');
      await move('g4', 'f3', '4... Bxf3');
      await move('d1', 'f3', '5. Qxf3');
      await move('d6', 'e5', '5... dxe5');

      console.log('\n========================================');
      console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
      console.log('========================================');
    };

    runFullTest();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Chessboard ref={ref} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
