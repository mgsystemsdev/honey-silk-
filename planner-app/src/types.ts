export type Hotspot = {
  x: number
  y: number
  w: number
  h: number
  toPage: number
}

export type PlannerPage = {
  index: number
  image: string
  links: Hotspot[]
}

export type PlannerManifest = {
  title: string
  pageWidth: number
  pageHeight: number
  pageCount: number
  pages: PlannerPage[]
}
