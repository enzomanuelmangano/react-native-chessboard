import { useContext } from 'react';
import { useChessboardProps } from '../context/props-context/hooks';
import { ArrowsContext } from '../context/board-refs-context';
import type { ArrowPair} from '../context/board-refs-context';

type Orientation = 'white' | 'black';

export type VisualWithArrows = {
  boardSize: number;
  squareSize: number; // same as pieceSize
  orientation: Orientation;
  arrows: ArrowPair[];
};

export const useBoardVisualWithArrows = (): VisualWithArrows => {
  const props = useChessboardProps();
  const arrows = useContext(ArrowsContext) || [];

  const orientation: Orientation =
    (props as any).orientation === 'black' ? 'black' : 'white';

  const { boardSize, pieceSize } = props as any;
  return { boardSize, squareSize: pieceSize, orientation, arrows };
};
