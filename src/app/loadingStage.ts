export const LOADING_STAGES = ['starting', 'signingIn', 'loadingReport'] as const

export type LoadingStage = (typeof LOADING_STAGES)[number]
