/**
 * One screen, described once and emitted as both SwiftUI and Flutter.
 *
 * The point of the chapter is that these are two dialects for the same
 * sentence, so the generators take the identical state and the differences you
 * see are real differences between the frameworks — not two things I wrote to
 * look different.
 */

export type Accent = 'brand' | 'ok' | 'info';
/** Stacked runs down the screen; inline runs across it. */
export type Layout = 'stacked' | 'inline';

export interface ScreenState {
  accent: Accent;
  layout: Layout;
  radius: number;
  chart: boolean;
}

export const DEFAULT_STATE: ScreenState = {
  accent: 'brand',
  layout: 'stacked',
  radius: 18,
  chart: true,
};

/** Gap between elements, in points. Inline rows want a little more air. */
export const spacingOf = (l: Layout) => (l === 'inline' ? 14 : 14);

/**
 * The reading's type size. An inline arrangement has to give the number back
 * some room or it simply wraps, and a card that wraps is a stacked card with
 * extra steps.
 */
export const fontOf = (l: Layout) => (l === 'inline' ? 26 : 44);

export const ACCENTS: Record<Accent, { swift: string; dart: string; css: string }> = {
  brand: { swift: '.pink', dart: 'const Color(0xFFFF2D55)', css: '#ff2d55' },
  ok:    { swift: '.green', dart: 'const Color(0xFF34D399)', css: '#34d399' },
  info:  { swift: '.cyan', dart: 'const Color(0xFF38BDF8)', css: '#38bdf8' },
};

export function swiftUI(s: ScreenState): string {
  const gap = spacingOf(s.layout);
  const accent = ACCENTS[s.accent].swift;
  const inline = s.layout === 'inline';
  const stack = inline
    ? `HStack(alignment: .firstTextBaseline, spacing: ${gap})`
    : `VStack(alignment: .leading, spacing: ${gap})`;
  const chart = s.chart ? `\n      MoistureChart(points: reading.history)\n        .frame(height: 44)\n` : '\n';
  return `struct ReadingCard: View {
  let reading: Reading

  var body: some View {
    ${stack} {
      Text(reading.sensor)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text("\\(reading.moisture)%")
        .font(.system(size: ${fontOf(s.layout)}, weight: .semibold))
        .foregroundStyle(${accent})

      StatusPill(state: reading.state)
${chart}    }
    .padding(16)
    .background(
      .regularMaterial,
      in: RoundedRectangle(cornerRadius: ${s.radius})
    )
  }
}`;
}

export function flutter(s: ScreenState): string {
  const gap = spacingOf(s.layout);
  const accent = ACCENTS[s.accent].dart;
  const inline = s.layout === 'inline';
  // In a Row the spacer changes axis: height becomes width. SwiftUI's spacing:
  // parameter does not care which way the stack runs.
  const spacer = inline ? `SizedBox(width: ${gap})` : `SizedBox(height: ${gap})`;
  const widget = inline ? 'Row' : 'Column';
  const align = inline
    ? 'crossAxisAlignment: CrossAxisAlignment.baseline,\n        textBaseline: TextBaseline.alphabetic,'
    : 'crossAxisAlignment: CrossAxisAlignment.start,';
  const chart = s.chart
    ? `\n          ${spacer},\n          SizedBox(height: 44, width: 90, child: MoistureChart(points: reading.history)),`
    : '';
  return `class ReadingCard extends StatelessWidget {
  const ReadingCard({super.key, required this.reading});

  final Reading reading;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(${s.radius}),
      ),
      child: ${widget}(
        ${align}
        children: [
          Text(reading.sensor,
              style: Theme.of(context).textTheme.labelSmall),
          ${spacer},
          Text('\${reading.moisture}%',
              style: TextStyle(
                fontSize: ${fontOf(s.layout)},
                fontWeight: FontWeight.w600,
                color: ${accent},
              )),
          ${spacer},
          StatusPill(state: reading.state),${chart}
        ],
      ),
    );
  }
}`;
}

/** How many explicit spacers each dialect needs to express the same gaps. */
export function spacerCount(s: ScreenState): { swift: number; dart: number } {
  return {
    swift: (swiftUI(s).match(/spacing:/g) ?? []).length,
    dart: (flutter(s).match(/SizedBox\((?:height|width): \d+\)/g) ?? []).length,
  };
}
