// Hand-drawn 16×16 football. White panels, black patches, transparent outside.
const ROWS = [
  '................',
  '......####......',
  '....##WWWW##....',
  '...#WW#WW#WW#...',
  '..#W##WWWW##W#..',
  '..#WWWW##WWWW#..',
  '.#W#WW#WW#WW#W#.',
  '.#WW##WWWW##WW#.',
  '.#WW##WWWW##WW#.',
  '.#W#WW#WW#WW#W#.',
  '..#WWWW##WWWW#..',
  '..#W##WWWW##W#..',
  '...#WW#WW#WW#...',
  '....##WWWW##....',
  '......####......',
  '................',
]

const PIXELS = []
ROWS.forEach((row, y) => {
  ;[...row].forEach((cell, x) => {
    if (cell === '#' || cell === 'W') PIXELS.push([x, y, cell === '#' ? '#000' : '#fff'])
  })
})

export default function Ball({ spin = false }) {
  return (
    <svg
      className={spin ? 'pixel-ball spin' : 'pixel-ball'}
      viewBox="0 0 16 16"
      width="32"
      height="32"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {PIXELS.map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
      ))}
    </svg>
  )
}
