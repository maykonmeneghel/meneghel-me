/**
 * One screen, described once and emitted as both SwiftUI and Flutter.
 *
 * The point of the chapter is that these are two dialects for the same
 * sentence, so the generators take the identical state and the differences you
 * see are real differences between the frameworks — not two things I wrote to
 * look different.
 */

export type Accent = 'brand' | 'ok' | 'info';
export type Density = 'compact' | 'comfortable';

export interface ScreenState {
  accent: Accent;
  density: Density;
  radius: number;
  chart: boolean;
}

export const DEFAULT_STATE: ScreenState = {
  accent: 'brand',
  density: 'comfortable',
  radius: 18,
  chart: true,
};

/** Gap between stacked elements, in points. */
export const spacingOf = (d: Density) => (d === 'compact' ? 6 : 14);

export const ACCENTS: Record<Accent, { swift: string; dart: string; css: string }> = {
  brand: { swift: '.pink', dart: 'const Color(0xFFFF2D55)', css: '#ff2d55' },
  ok:    { swift: '.green', dart: 'const Color(0xFF34D399)', css: '#34d399' },
  info:  { swift: '.cyan', dart: 'const Color(0xFF38BDF8)', css: '#38bdf8' },
};

export function swiftUI(s: ScreenState): string {
  const gap = spacingOf(s.density);
  const accent = ACCENTS[s.accent].swift;
  const chart = s.chart ? `\n      MoistureChart(points: reading.history)\n        .frame(height: 44)\n` : '\n';
  return `struct ReadingCard: View {
  let reading: Reading

  var body: some View {
    VStack(alignment: .leading, spacing: ${gap}) {
      Text(reading.sensor)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text("\\(reading.moisture)%")
        .font(.system(size: 44, weight: .semibold))
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
  const gap = spacingOf(s.density);
  const accent = ACCENTS[s.accent].dart;
  const chart = s.chart
    ? `\n          SizedBox(height: ${gap}),\n          SizedBox(height: 44, child: MoistureChart(points: reading.history)),`
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(reading.sensor,
              style: Theme.of(context).textTheme.labelSmall),
          SizedBox(height: ${gap}),
          Text('\${reading.moisture}%',
              style: TextStyle(
                fontSize: 44,
                fontWeight: FontWeight.w600,
                color: ${accent},
              )),
          SizedBox(height: ${gap}),
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
    dart: (flutter(s).match(/SizedBox\(height:/g) ?? []).length,
  };
}
