import { RadioGroup, Radio } from '@headlessui/react'
import { useState } from 'react'
import { riskRatings } from '../utils/riskRatings'

const levels = Object.entries(riskRatings).map(([key, value]) => ({
  rating: Number(key),
  ...value,
}))

export function RiskLevelSelector() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <RadioGroup value={selected} onChange={setSelected} className="space-y-2">
      {levels.map((level) => (
        <Radio
          key={level.rating}
          value={level.rating}
          className="group flex cursor-pointer items-start gap-3 rounded-card border border-divider bg-white p-4 transition-colors data-checked:border-teal data-checked:bg-teal/20 hover:border-grey"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-grey group-data-checked:border-teal group-data-checked:bg-teal">
            <span className="h-2 w-2 rounded-full bg-white opacity-0 group-data-checked:opacity-100" />
          </span>
          <span>
            <span className="block font-body text-base font-medium text-navy">
              {level.rating}. {level.label}
            </span>
            <span className="block font-body text-sm text-grey">{level.description}</span>
          </span>
        </Radio>
      ))}
    </RadioGroup>
  )
}
