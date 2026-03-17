import { StatItem } from './StatItem'
import { Badge } from './Badge'

interface EpochIdDisplayProps {
  epochId: number
  isCurrent: boolean
}

export function EpochIdDisplay({ epochId, isCurrent }: EpochIdDisplayProps) {
  return (
    <StatItem label="Epoch ID">
      <span className="flex items-center gap-2 min-h-[2rem]">
        <span>{epochId}</span>
        {isCurrent && (
          <Badge variant="dark" className="px-2.5">CURRENT</Badge>
        )}
      </span>
    </StatItem>
  )
}
