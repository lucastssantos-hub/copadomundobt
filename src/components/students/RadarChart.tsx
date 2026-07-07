import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { AXES, AXIS_CONFIG, AxisScores } from '../../types/students';
import { colors } from '../../theme';

interface RadarChartProps {
  values: AxisScores;
  compareValues?: AxisScores; // perfil anterior, desenhado atrás
  size?: number;
}

const MAX_SCORE = 5;

function polygonPoints(scores: AxisScores, cx: number, cy: number, radius: number): string {
  return AXES.map((axis, i) => {
    const value = scores[axis] ?? 0;
    const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    const r = (value / MAX_SCORE) * radius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

export function RadarChart({ values, compareValues, size = 240 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;

  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {gridLevels.map(level => (
          <Polygon
            key={level}
            points={AXES.map((_, i) => {
              const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
              const r = (level / MAX_SCORE) * radius;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}

        {AXES.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          const lx = cx + (radius + 16) * Math.cos(angle);
          const ly = cy + (radius + 16) * Math.sin(angle);
          return (
            <React.Fragment key={axis}>
              <Line x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border} strokeWidth={1} />
              <SvgText
                x={lx}
                y={ly + 4}
                fontSize={11}
                fontWeight="600"
                fill={AXIS_CONFIG[axis].color}
                textAnchor="middle"
              >
                {AXIS_CONFIG[axis].short}
              </SvgText>
            </React.Fragment>
          );
        })}

        {compareValues && (
          <Polygon
            points={polygonPoints(compareValues, cx, cy, radius)}
            fill={`${colors.textMuted}30`}
            stroke={colors.textMuted}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
        )}

        <Polygon
          points={polygonPoints(values, cx, cy, radius)}
          fill={`${colors.primary}40`}
          stroke={colors.primary}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
