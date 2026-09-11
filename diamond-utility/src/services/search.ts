import { type Diamond, type Filters } from '../models/diamond'

export function matchesQuery(diamond: Diamond, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  const haystacks = [
    diamond.baseName,
    diamond.id,
    ...diamond.folders.map((folder) => folder.folderName),
    ...diamond.folders.map((folder) => folder.variant),
    ...diamond.folders.flatMap((folder) => folder.files.map((file) => file.name)),
  ].map((value) => value.toLowerCase())

  if (haystacks.some((value) => value.includes(query))) return true
  return haystacks.some((value) => fuzzyIncludes(value, query))
}

export function fuzzyIncludes(haystack: string, query: string): boolean {
  let index = 0
  for (const char of query) {
    const next = haystack.indexOf(char, index)
    if (next === -1) return false
    index = next + 1
  }
  return true
}

export function matchesFilters(diamond: Diamond, filters: Filters): boolean {
  if (filters.variants.length > 0) {
    const hasVariant = filters.variants.some((variant) => {
      if (variant === 'base') return diamond.folders.some((folder) => folder.isBase)
      return diamond.folders.some((folder) => folder.variant.toLowerCase() === variant.toLowerCase())
    })
    if (!hasVariant) return false
  }
  if (filters.mp4.length > 0 && !filters.mp4.includes(diamond.mp4.availability)) return false
  if (filters.status.length > 0 && !filters.status.includes(diamond.status)) return false
  return true
}

export function filterDiamonds(diamonds: Diamond[], query: string, filters: Filters): Diamond[] {
  return diamonds.filter((diamond) => matchesQuery(diamond, query) && matchesFilters(diamond, filters))
}

export function activeFilterCount(filters: Filters): number {
  return filters.variants.length + filters.mp4.length + filters.status.length
}
