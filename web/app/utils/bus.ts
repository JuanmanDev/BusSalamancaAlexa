/**
 * Color palette for bus lines
 */
const LINE_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
]

const LINE_COLORS_HEX = [
    '#3B82F6', // blue-500
    '#A855F7', // purple-500
    '#22C55E', // green-500
    '#F97316', // orange-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
]

/**
 * Get the color class for a bus line based on its ID.
 * Cycles through a predefined palette.
 */
export function getLineColor(lineId: string): string {
    const index = parseInt(lineId || '0') % LINE_COLORS.length
    return LINE_COLORS[index] ?? LINE_COLORS[0]!
}

/**
 * Get hex color for a bus line based on its ID.
 */
export function getLineColorHex(lineId: string): string {
    const index = parseInt(lineId || '0') % LINE_COLORS_HEX.length
    return LINE_COLORS_HEX[index] ?? LINE_COLORS_HEX[0]!
}

/**
 * Generate SVG for a segmented circle marker
 * If single line: solid circle with line color
 * If multiple lines: pie chart with segments
 */
export function generateStopMarkerSVG(
    lineIds: string[],
    size: number = 24,
    isSelected: boolean = false
): string {
    const strokeWidth = isSelected ? 4 : 2
    const radius = (size - strokeWidth) / 2
    const center = size / 2

    if (lineIds.length === 0) {
        // Default gray marker
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${radius}" 
        fill="#9CA3AF" stroke="white" stroke-width="${strokeWidth}"/>
    </svg>`
    }

    if (lineIds.length === 1) {
        // Single color circle
        const color = getLineColorHex(lineIds[0]!)
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${radius}" 
        fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
    </svg>`
    }

    // Multi-segment pie chart
    const segmentAngle = 360 / lineIds.length
    let paths = ''

    lineIds.forEach((lineId, i) => {
        const startAngle = i * segmentAngle - 90 // Start from top
        const endAngle = startAngle + segmentAngle
        const color = getLineColorHex(lineId)

        // Calculate arc path
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180

        const x1 = center + radius * Math.cos(startRad)
        const y1 = center + radius * Math.sin(startRad)
        const x2 = center + radius * Math.cos(endRad)
        const y2 = center + radius * Math.sin(endRad)

        const largeArc = segmentAngle > 180 ? 1 : 0

        paths += `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}"/>`
    })

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${paths}
    <circle cx="${center}" cy="${center}" r="${radius}" 
      fill="none" stroke="white" stroke-width="${strokeWidth}"/>
  </svg>`
}
