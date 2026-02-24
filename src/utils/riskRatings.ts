export const riskRatings: Record<number, { label: string; shortLabel: string; description: string }> = {
  1: {
    label: 'Lower',
    shortLabel: 'Lower',
    description:
      "You're likely to be more conservative with your investments and understand that there may be some short-term changes in value to get potentially modest or relatively stable returns.",
  },
  2: {
    label: 'Lower-Medium',
    shortLabel: 'Lower-Med',
    description:
      "You're relatively cautious with your investments. You want the potential of getting reasonable long-term returns and are prepared to accept some risk in doing so. You understand there may be some frequent but small changes in value.",
  },
  3: {
    label: 'Medium',
    shortLabel: 'Medium',
    description:
      "You have a balanced approach to risk. You don't look for risky investments, but you don't avoid them either. You're prepared to accept fluctuations in the value of your investments to try and get potentially better long-term returns. You understand that the value of your investments might change frequently and sometimes significantly.",
  },
  4: {
    label: 'Medium-Higher',
    shortLabel: 'Med-Higher',
    description:
      "You're comfortable taking some investment risk to get potentially better higher long-term returns, even if that means there might be times when you're getting potentially lower returns. You understand the value of your investments are likely to change frequently and often significantly.",
  },
  5: {
    label: 'Higher',
    shortLabel: 'Higher',
    description:
      "You're very comfortable taking investment risk. You're aiming for potentially high long-term returns and are less concerned if the value of your investments go up and down over the short or medium term. You understand that the value of your investments is likely to change very frequently and significantly.",
  },
}

export function getRiskRating(rating: number): { label: string; shortLabel: string; description: string } | undefined {
  return riskRatings[rating]
}
