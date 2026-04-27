import { describe, it, expect } from 'vitest'
import { PipelineEngine } from '@/main/engine/pipeline'

describe('PipelineEngine', () => {
  it('should start in idle state', () => {
    const engine = new PipelineEngine('test-project', 100)
    expect(engine.state.status).toBe('idle')
    expect(engine.state.phase).toBe('idle')
    expect(engine.state.completedChapters).toBe(0)
    expect(engine.state.totalChapters).toBe(100)
    expect(engine.state.projectId).toBe('test-project')
  })

  it('should transition on start', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.start()
    expect(engine.state.phase).toBe('planning')
    expect(engine.state.status).toBe('planning')
  })

  it('should emit events on transition', () => {
    const engine = new PipelineEngine('test-project', 100)
    let emitted = false
    let capturedPhase = ''
    engine.on('phase:enter', (e: { phase: string; timestamp: number }) => {
      emitted = true
      capturedPhase = e.phase
    })
    engine.start()
    expect(emitted).toBe(true)
    expect(capturedPhase).toBe('planning')
  })

  it('should calculate progress', () => {
    const engine = new PipelineEngine('test-project', 40)
    expect(engine.getProgress().percent).toBe(0)
    engine.completeChapter()
    expect(engine.getProgress().percent).toBeGreaterThan(0)
    expect(engine.getProgress().estimatedRemainingMs).toBeGreaterThan(0)
  })

  it('should handle pause and resume', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.start()
    engine.pause()
    expect(engine.state.status).toBe('paused')
    expect(engine.state.phase).toBe('paused')
    engine.resume()
    expect(engine.state.phase).toBe('writing')
  })

  it('should complete when all chapters done', () => {
    const engine = new PipelineEngine('test-project', 2)
    expect(engine.state.completedChapters).toBe(0)
    engine.completeChapter()
    expect(engine.state.completedChapters).toBe(1)
    expect(engine.state.status).not.toBe('completed')
    engine.completeChapter()
    expect(engine.state.completedChapters).toBe(2)
    expect(engine.state.status).toBe('completed')
    expect(engine.state.phase).toBe('completed')
  })

  it('should transition to writing on beginWriting', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.beginWriting()
    expect(engine.state.phase).toBe('writing')
  })

  it('should transition to lore_updating on beginLoreUpdate', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.beginLoreUpdate()
    expect(engine.state.phase).toBe('lore_updating')
  })

  it('should transition to checkpoint on beginCheckpoint', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.beginCheckpoint()
    expect(engine.state.phase).toBe('checkpoint')
  })

  it('should set current chapter', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.setCurrentChapter('vol-1', 'ch-001')
    expect(engine.state.currentVolumeId).toBe('vol-1')
    expect(engine.state.currentChapterId).toBe('ch-001')
  })

  it('toJSON should return PipelineState', () => {
    const engine = new PipelineEngine('test-project', 100)
    engine.start()
    engine.setCurrentChapter('vol-1', 'ch-001')
    const json = engine.toJSON()
    expect(json.projectId).toBe('test-project')
    expect(json.totalChapters).toBe(100)
    expect(json.phase).toBe('planning')
    expect(json.currentVolumeId).toBe('vol-1')
  })

  it('should have unique IDs for each instance', () => {
    const engine1 = new PipelineEngine('proj-1', 10)
    const engine2 = new PipelineEngine('proj-2', 20)
    expect(engine1.state.id).not.toBe(engine2.state.id)
  })
})
