export { SYSTEM_PROMPTS } from './system-prompts'

// Roles
export { architectPrompt } from './roles/architect'
export { mainWriterPrompt } from './roles/main-writer'
export { mainWriterAltPrompt } from './roles/main-writer-alt'
export { characterAdvocatePrompt } from './roles/character-advocate'
export { atmospherePrompt } from './roles/atmosphere'
export { criticPrompt } from './roles/critic'
export { continuityPrompt } from './roles/continuity'
export { revisePrompt } from './roles/revise'
export { mergeBestPrompt } from './roles/merge-best'
export { finalRevisePrompt } from './roles/final-revise'
export { summaryPrompt } from './roles/summary'

// Pipeline
export { decidePrompt } from './pipeline/decide'
export { createBriefPrompt } from './pipeline/create-brief'
export { updateStatePrompt } from './pipeline/update-state'

// Lore
export { updateCharacterPrompt } from './lore/update-character'
export { updateForeshadowPrompt } from './lore/update-foreshadow'
export { generateSummaryPrompt } from './lore/generate-summary'
export { refreshContextPrompt } from './lore/refresh-context'
