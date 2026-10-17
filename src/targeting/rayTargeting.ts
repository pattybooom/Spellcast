import type { ScreenPoint } from '../tracking/projection'

export type NormalizedBox = { x: number; y: number; width: number; height: number }
export type PointingRay = { origin: ScreenPoint; direction: ScreenPoint }

export function makePointingRay(base: ScreenPoint, tip: ScreenPoint): PointingRay | null {
  const dx = tip.x - base.x
  const dy = tip.y - base.y
  const length = Math.hypot(dx, dy)
  if (length < 1) return null
  return { origin: tip, direction: { x: dx / length, y: dy / length } }
}

export function rayIntersectsBox(ray: PointingRay, box: NormalizedBox, width: number, height: number): boolean {
  const minX = box.x * width
  const minY = box.y * height
  const maxX = minX + box.width * width
  const maxY = minY + box.height * height
  let near = Number.NEGATIVE_INFINITY
  let far = Number.POSITIVE_INFINITY

  for (const [origin, direction, min, max] of [
    [ray.origin.x, ray.direction.x, minX, maxX],
    [ray.origin.y, ray.direction.y, minY, maxY]
  ]) {
    if (Math.abs(direction) < 1e-6) {
      if (origin < min || origin > max) return false
      continue
    }
    const first = (min - origin) / direction
    const second = (max - origin) / direction
    near = Math.max(near, Math.min(first, second))
    far = Math.min(far, Math.max(first, second))
    if (near > far) return false
  }

  return far >= Math.max(near, 0)
}

export function rayToPreviewEdge(ray: PointingRay, width: number, height: number): ScreenPoint | null {
  const intersections: ScreenPoint[] = []
  const { x, y } = ray.origin
  const { x: dx, y: dy } = ray.direction

  if (Math.abs(dx) > 1e-6) {
    for (const edgeX of [0, width]) {
      const t = (edgeX - x) / dx
      const edgeY = y + t * dy
      if (t >= 0 && edgeY >= 0 && edgeY <= height) intersections.push({ x: edgeX, y: edgeY })
    }
  }
  if (Math.abs(dy) > 1e-6) {
    for (const edgeY of [0, height]) {
      const t = (edgeY - y) / dy
      const edgeX = x + t * dx
      if (t >= 0 && edgeX >= 0 && edgeX <= width) intersections.push({ x: edgeX, y: edgeY })
    }
  }

  if (!intersections.length) return null
  return intersections.reduce((furthest, point) =>
    Math.hypot(point.x - x, point.y - y) > Math.hypot(furthest.x - x, furthest.y - y) ? point : furthest
  )
}
