/**
 * Get the color class for a bus line based on its ID.
 * Cycles through a predefined palette.
 */
export function getLineColor(lineId: string): string {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
    const index = parseInt(lineId || '0') % colors.length
    return colors[index] ?? colors[0]!
}
