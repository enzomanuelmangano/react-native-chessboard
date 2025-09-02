import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

type ArrowPair = [string, string];
type Orientation = 'white' | 'black';

type Props = {
  arrows: ArrowPair[];                
  boardSize: number;                  
  squareSize: number;                 
  orientation?: Orientation;          
  color?: string;                     
  borderColor?: string;
};

const round = (n: number) => Math.round(n * 10) / 10;

function squareToCenter(square: string, squareSize: number, orientation: Orientation = 'white') {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;             
  if (orientation === 'white') {
    const x = file * squareSize + squareSize / 2;
    const y = (7 - rank) * squareSize + squareSize / 2;
    return { x: round(x), y: round(y) };
  } else {
    const x = (7 - file) * squareSize + squareSize / 2;
    const y = rank * squareSize + squareSize / 2;
    return { x: round(x), y: round(y) };
  }
}

const ArrowOverlay: React.FC<Props> = ({
  arrows = [],
  boardSize,
  squareSize,
  orientation = 'white',
  color = 'rgba(242, 255, 0, 0.5)',
}) => {
  if (!arrows || arrows.length === 0) return null;

  const baseThickness = Math.max(1, squareSize * 0.25);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: boardSize,
        height: boardSize,
      }}
    >
      <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
        {arrows.map(([from, to], idx) => {
          const start = squareToCenter(from, squareSize, orientation);
          const end = squareToCenter(to, squareSize, orientation);

          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const angle = Math.atan2(dy, dx);

          const thickness = round(baseThickness * Math.pow(0.7, idx));

          // head dimensions
          const headLen = Math.max(6, thickness * 1.6);
          const headWidth = thickness * 2.5;

          // shaft ends exactly at base of head
          const shaftEndX = end.x - headLen * Math.cos(angle);
          const shaftEndY = end.y - headLen * Math.sin(angle);

          // triangle base corners
          const perpX = Math.cos(angle + Math.PI / 2) * (headWidth / 2);
          const perpY = Math.sin(angle + Math.PI / 2) * (headWidth / 2);

          const tipX = end.x;
          const tipY = end.y;
          const leftX = shaftEndX + perpX;
          const leftY = shaftEndY + perpY;
          const rightX = shaftEndX - perpX;
          const rightY = shaftEndY - perpY;

          const linePath = `M ${start.x} ${start.y} L ${shaftEndX} ${shaftEndY}`;

          return (
            <React.Fragment key={`arrow-${from}-${to}-${idx}`}>
              {/* Shaft */}
              <Path
                d={linePath}
                stroke={color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />

              {/* Head */}
              <Polygon
                points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                fill={color}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

export default memo(ArrowOverlay);
