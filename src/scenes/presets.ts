export type SceneId = 'calm' | 'study' | 'party'
export type ScenePosition = SceneId | null
export type SceneState = { active: ScenePosition; applying: boolean; cyclingColors: boolean; error?: string }

export const SCENE_CYCLE: readonly ScenePosition[] = ['calm', 'study', 'party', null]

export const SCENES = {
  calm: { label: 'Calm', description: 'Orange · 35%', music: 'entitled — kwes e', track: 'spotify:track:7jn7SOuYxnrAoz3QSmhIgQ', lamp: { state: 'ON', brightness: 89, color: { r: 255, g: 100, b: 0 }, transition: 1 } },
  study: { label: 'Study', description: 'Bright white · 100%', music: 'Clair de lune — Debussy', track: 'spotify:track:4nDWmVFlg15oNpOHFyQdGT', lamp: { state: 'ON', brightness: 254, color_temp: 250, transition: 1 } },
  party: { label: 'Party', description: 'Color cycle · full brightness', music: 'Drop It Like It’s Hot — Snoop Dogg', track: 'spotify:track:1WqypbNyfSErs5I7BmfIRe', lamp: { state: 'ON', brightness: 254, color: { r: 255, g: 0, b: 28 }, transition: 0.6 } }
} as const
