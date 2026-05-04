import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Skia, RuntimeShader } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import Chessboard, {
  ChessboardRef,
  EffectParams,
  MoveResult,
} from 'react-native-chessboard';

// Damped-sine pixel refraction with pronounced chromatic aberration.
// Inspired by GL Transitions' ButterflyWaveScrawler — the R, G, B
// channels are sampled at scaled multiples of the displacement so the
// wavefront leaves a glassy rainbow fringe along its leading edges.
const RIPPLE_SKSL = `
uniform float2 u_origin;
uniform float u_time;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_decay;
uniform float u_speed;
uniform float u_colorSeparation;
uniform shader image;

half4 main(float2 position) {
  float2 toOrigin = position - u_origin;
  float dist = length(toOrigin);
  float t = max(0.0, u_time - dist / u_speed);

  float ripple = u_amplitude * sin(u_frequency * t) * exp(-u_decay * t);

  float2 n = dist > 0.0001 ? toOrigin / dist : float2(0.0);
  float2 baseDisp = ripple * n;

  half4 mid = image.eval(position + baseDisp);
  half r = image.eval(position + baseDisp * (1.0 - u_colorSeparation)).r;
  half b = image.eval(position + baseDisp * (1.0 + u_colorSeparation)).b;

  return half4(r, mid.g, b, mid.a);
}
`;

const RIPPLE_SHADER = Skia.RuntimeEffect.Make(RIPPLE_SKSL)!;
const RIPPLE_DURATION_S = 2.0;

type RGBA = [number, number, number, number];

const TRIGGER_COLORS: Record<string, RGBA> = {
  checkmate: [0.98, 0.58, 0.42, 1.0],
  check: [0.98, 0.82, 0.45, 1.0],
  stalemate: [0.62, 0.78, 0.98, 1.0],
  '': [0, 0, 0, 0],
};

const RippleEffect: React.FC<EffectParams> = ({
  centerX,
  centerY,
  progress,
  trigger,
  boardSize,
}) => {
  const uniforms = useDerivedValue(() => {
    const color = TRIGGER_COLORS[trigger.value] ?? TRIGGER_COLORS[''];
    const active = color[3] > 0 && progress.value < 1.0 ? 1.0 : 0.0;
    return {
      u_origin: [centerX.value, centerY.value],
      u_time: progress.value * RIPPLE_DURATION_S,
      u_amplitude: 12 * active,
      u_frequency: 13,
      u_decay: 3,
      u_speed: boardSize * 1.0,
      u_colorSeparation: 0.22,
    };
  });

  return <RuntimeShader source={RIPPLE_SHADER} uniforms={uniforms} />;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FOOLS_MATE: Array<[string, string]> = [
  ['f2', 'f3'],
  ['e7', 'e5'],
  ['g2', 'g4'],
  ['d8', 'h4'],
];

export default function App() {
  const ref = useRef<ChessboardRef>(null);
  const [status, setStatus] = useState('Fool’s Mate');
  const [running, setRunning] = useState(false);
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 40, 380);

  const handleMove = useCallback((result: MoveResult) => {
    if (result.state.isCheckmate) {
      setStatus('Checkmate');
    } else if (result.state.isStalemate) {
      setStatus('Stalemate');
    } else if (result.state.isCheck) {
      setStatus('Check');
    } else {
      setStatus(result.move.color === 'w' ? 'Black to move' : 'White to move');
    }
  }, []);

  const playSequence = useCallback(async () => {
    if (running) return;
    setRunning(true);
    ref.current?.resetBoard();
    setStatus('White to move');
    await delay(700);
    for (const [from, to] of FOOLS_MATE) {
      await ref.current?.move({ from: from as any, to: to as any });
      await delay(350);
    }
    setRunning(false);
  }, [running]);

  useEffect(() => {
    playSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.bgGradient} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>react-native-chessboard</Text>
        <Text style={styles.title}>{status}</Text>
      </View>

      <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
        <View style={styles.boardShadow} />
        <Chessboard
          ref={ref}
          boardSize={boardSize}
          onMove={handleMove}
          renderEffect={(params) => <RippleEffect {...params} />}
        />
      </View>

      <Pressable
        onPress={playSequence}
        disabled={running}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          running && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {running ? 'Playing…' : 'Replay'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0f',
  },
  header: {
    position: 'absolute',
    top: 80,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#6c6c80',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '600',
  },
  title: {
    color: '#f5f5f7',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  boardWrap: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  boardShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: '#0d0d14',
  },
  button: {
    position: 'absolute',
    bottom: 80,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#1c1c24',
    borderWidth: 1,
    borderColor: '#2a2a36',
  },
  buttonPressed: {
    backgroundColor: '#252532',
    transform: [{ scale: 0.97 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#f5f5f7',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
