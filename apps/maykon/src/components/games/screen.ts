/**
 * One card, emitted as SwiftUI and as Flutter from a single state.
 *
 * The chapter only works if the two really are the same screen, so everything
 * the preview shows has to appear in both sources — the gradient, the border,
 * the delta chip, the divider, the footer stats. Anything drawn in the preview
 * and missing from the code would make the whole comparison a lie.
 */

export type Accent = 'brand' | 'ok' | 'info';
/** Stacked runs down the screen and has room for the chart; inline runs across. */
export type Layout = 'stacked' | 'inline';

export interface ScreenState {
  accent: Accent;
  layout: Layout;
  radius: number;
}

export const DEFAULT_STATE: ScreenState = {
  accent: 'brand',
  layout: 'stacked',
  radius: 18,
};

/** Gap between elements, in points. */
export const spacingOf = (l: Layout) => (l === 'inline' ? 12 : 14);

/**
 * The reading's type size. An inline arrangement has to give the number back
 * some room or it simply wraps, and a card that wraps is a stacked card with
 * extra steps.
 */
export const fontOf = (l: Layout) => (l === 'inline' ? 28 : 44);

/** There is no room for a chart across a row, so the arrangement decides. */
export const hasChart = (l: Layout) => l === 'stacked';

export const ACCENTS: Record<Accent, { swift: string; dart: string; css: string }> = {
  brand: { swift: '.pink', dart: 'const Color(0xFFFF2D55)', css: '#ff2d55' },
  ok: { swift: '.green', dart: 'const Color(0xFF34D399)', css: '#34d399' },
  info: { swift: '.cyan', dart: 'const Color(0xFF38BDF8)', css: '#38bdf8' },
};

export function swiftUI(s: ScreenState): string {
  const gap = spacingOf(s.layout);
  const accent = ACCENTS[s.accent].swift;
  const inline = s.layout === 'inline';

  const value = `      HStack(alignment: .firstTextBaseline, spacing: 6) {
        Text("\\(reading.moisture)")
          .font(.system(size: ${fontOf(s.layout)}, weight: .semibold, design: .rounded))
          .foregroundStyle(${accent})
        Text("%")
          .font(.headline.weight(.medium))
          .foregroundStyle(${accent}.opacity(0.55))
        Spacer(minLength: 12)
        DeltaChip(value: reading.delta, tint: ${accent})
      }`;

  const body = inline
    ? `    HStack(alignment: .firstTextBaseline, spacing: ${gap}) {
${value.split('\n').map((l) => '  ' + l).join('\n')}

        StatusPill(state: reading.state)
      }`
    : `    VStack(alignment: .leading, spacing: ${gap}) {
${value}

      StatusPill(state: reading.state)

      MoistureChart(points: reading.history)
        .frame(height: 48)

      Divider().overlay(.white.opacity(0.06))

      HStack(spacing: 18) {
        Stat(label: "depth", value: reading.depth)
        Stat(label: "soil", value: reading.soilTemp)
      }
    }`;

  return `struct ReadingCard: View {
  let reading: Reading

  var body: some View {
    VStack(alignment: .leading, spacing: ${gap}) {
      HStack {
        Text(reading.sensor)
          .font(.caption.monospaced())
          .foregroundStyle(.secondary)
        Spacer()
        TimeChip(seconds: reading.age)
      }

${body}
    }
    .padding(18)
    .background(
      LinearGradient(
        colors: [.white.opacity(0.07), .white.opacity(0.02)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ),
      in: RoundedRectangle(cornerRadius: ${s.radius}, style: .continuous)
    )
    .overlay(
      RoundedRectangle(cornerRadius: ${s.radius}, style: .continuous)
        .strokeBorder(.white.opacity(0.09))
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

  const value = `          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('\${reading.moisture}',
                  style: TextStyle(
                    fontSize: ${fontOf(s.layout)},
                    fontWeight: FontWeight.w600,
                    color: ${accent},
                  )),
              const SizedBox(width: 6),
              Text('%', style: TextStyle(color: ${accent}.withOpacity(0.55))),
              const Spacer(),
              DeltaChip(value: reading.delta, tint: ${accent}),
            ],
          )`;

  const body = inline
    ? `        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Expanded(child: ${value.trim()}),
            ${spacer},
            StatusPill(state: reading.state),
          ],
        ),`
    : `${value},
          ${spacer},
          StatusPill(state: reading.state),
          ${spacer},
          SizedBox(height: 48, child: MoistureChart(points: reading.history)),
          ${spacer},
          Divider(color: Colors.white.withOpacity(0.06), height: 1),
          ${spacer},
          Row(children: [
            Stat(label: 'depth', value: reading.depth),
            const SizedBox(width: 18),
            Stat(label: 'soil', value: reading.soilTemp),
          ]),`;

  return `class ReadingCard extends StatelessWidget {
  const ReadingCard({super.key, required this.reading});

  final Reading reading;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.07),
            Colors.white.withOpacity(0.02),
          ],
        ),
        border: Border.all(color: Colors.white.withOpacity(0.09)),
        borderRadius: BorderRadius.circular(${s.radius}),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Text(reading.sensor,
                  style: Theme.of(context).textTheme.labelSmall),
              const Spacer(),
              TimeChip(seconds: reading.age),
            ]),
            ${spacer},
${body}
          ],
        ),
      ),
    );
  }
}`;
}

/** How many explicit spacers each dialect needs to express the same gaps. */
export function spacerCount(s: ScreenState): { swift: number; dart: number } {
  return {
    swift: (swiftUI(s).match(/spacing: \d+/g) ?? []).length,
    dart: (flutter(s).match(/SizedBox\((?:height|width): \d+\)/g) ?? []).length,
  };
}
