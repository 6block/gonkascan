import { hierarchy, pack } from 'd3-hierarchy'

type BubbleNode = {
  id: string
  value: number
  color: string
}

type RootNode = {
  children: BubbleNode[]
}

type Props = {
  data: BubbleNode[]
  width: number
  height: number
}

export function VoteBubblePack({ data, width, height }: Props) {
  if (!data.length || width <= 0 || height <= 0) return null

  const padding = 12

  const root = hierarchy<RootNode>({ children: data })
    .sum((d) => {
      return (d as unknown as Partial<BubbleNode>)?.value ?? 0
    })
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  const layout = pack<RootNode>()
    .size([width - padding * 2, height - padding * 2])
    .padding(3)

  const nodes = layout(root).leaves()

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${padding}, ${padding})`}>
        {nodes.map((node) => {
          const d = node.data as unknown as BubbleNode
          return (
            <circle
              key={d.id}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={d.color}
              stroke="#ffffff"
              strokeWidth={2}
              opacity={0.95}
            />
          )
        })}
      </g>
    </svg>
  )
}
