import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { encodeCode128B } from '@/lib/code128';

interface Barcode128Props {
  value: string;
  maxWidth: number;
  height?: number;
}

// Real barcodes need consistent dark-bars-on-light-background contrast to
// scan, regardless of the app's own light/dark theme — unlike the rest of
// this screen, this is NOT theme-aware on purpose. A scanner (or a
// camera) reading light bars off a dark card, which is what the old
// decorative version did in dark mode, simply wouldn't work.
const BAR_COLOR = '#000000';
const QUIET_ZONE_MODULES = 10;

const BOX_PADDING = 12;

export function Barcode128({ value, maxWidth, height = 70 }: Barcode128Props) {
  const modules = encodeCode128B(value);

  // Falls back to plain text-only display (handled by the caller, which
  // already shows redemption_value as text below this) rather than
  // rendering nothing or a broken graphic if the value contains a
  // character Subset B can't encode.
  if (!modules) return null;

  // maxWidth is the budget for the whole white box, padding included.
  const svgMaxWidth = Math.max(0, maxWidth - BOX_PADDING * 2);
  const totalModules = modules.length + QUIET_ZONE_MODULES * 2;
  const moduleWidth = Math.max(1, Math.min(3, svgMaxWidth / totalModules));
  const svgWidth = totalModules * moduleWidth;

  const bars: { x: number; width: number }[] = [];
  let i = 0;
  while (i < modules.length) {
    if (modules[i] === '1') {
      let run = 1;
      while (i + run < modules.length && modules[i + run] === '1') run++;
      bars.push({ x: (QUIET_ZONE_MODULES + i) * moduleWidth, width: run * moduleWidth });
      i += run;
    } else {
      i++;
    }
  }

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: BOX_PADDING, alignSelf: 'center' }}>
      <Svg width={svgWidth} height={height}>
        {bars.map((bar, idx) => (
          <Rect key={idx} x={bar.x} y={0} width={bar.width} height={height} fill={BAR_COLOR} />
        ))}
      </Svg>
    </View>
  );
}
