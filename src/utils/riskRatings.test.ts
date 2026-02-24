import { getRiskRating, riskRatings } from './riskRatings'

describe('riskRatings', () => {
  it('contains entries for ratings 1 through 5', () => {
    expect(Object.keys(riskRatings)).toHaveLength(5)
    for (let i = 1; i <= 5; i++) {
      expect(riskRatings[i]).toBeDefined()
    }
  })

  it.each([
    [1, 'Lower'],
    [2, 'Lower-Medium'],
    [3, 'Medium'],
    [4, 'Medium-Higher'],
    [5, 'Higher'],
  ])('rating %i has label "%s"', (rating, expectedLabel) => {
    expect(getRiskRating(rating)?.label).toBe(expectedLabel)
  })

  it.each([1, 2, 3, 4, 5])('rating %i has a non-empty description', (rating) => {
    const info = getRiskRating(rating)
    expect(info?.description).toBeTruthy()
    expect(info?.description.length).toBeGreaterThan(20)
  })

  it.each([
    [1, 'Lower'],
    [2, 'Lower-Med'],
    [3, 'Medium'],
    [4, 'Med-Higher'],
    [5, 'Higher'],
  ])('rating %i has shortLabel "%s"', (rating, expectedShort) => {
    expect(getRiskRating(rating)?.shortLabel).toBe(expectedShort)
  })

  it('returns undefined for out-of-range ratings', () => {
    expect(getRiskRating(0)).toBeUndefined()
    expect(getRiskRating(6)).toBeUndefined()
    expect(getRiskRating(-1)).toBeUndefined()
  })
})
