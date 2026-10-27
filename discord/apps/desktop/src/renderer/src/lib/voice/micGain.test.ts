import { describe, expect, it, vi } from 'vitest'
import { FakeAudioContext, fakeMediaTrack } from './fakeWebAudio'
import { aimGateOpen, createMicChain, floatRms, followLeveler, limiterAttenuation, limiterCurve, nextLevelerGain, peakSample, preSliderRms, readChainRms, softLimitSample } from './micGain'
import { FakeAudioParam } from './fakeWebAudio'
import { rmsToDb } from './micLevel'

describe('micGain', () => {
  it('100% do limiter é a reta: o sample do meio sai igual', () => {
    expect(softLimitSample(0)).toBe(0)
    expect(softLimitSample(0.5)).toBe(0.5)
    expect(softLimitSample(-0.5)).toBe(-0.5)
    expect(softLimitSample(0.95), 'o joelho segura o pico').toBeCloseTo(0.9374174418021864)
    expect(softLimitSample(1)).toBeCloseTo(0.9642391233933647)
    expect(softLimitSample(Number.NaN)).toBe(0)
    expect(limiterAttenuation(0.5), 'abaixo do joelho não atenua').toBe(0)
    expect(limiterAttenuation(1), 'o pico é segurado sem zerar').toBeCloseTo(0.035760876606635295)
    expect(peakSample(new Float32Array([0])), 'zero é silêncio').toBe(0)
    expect(peakSample(new Float32Array([-0.75, 0.25]))).toBe(0.75)
  })

  it('a curva do shaper é identidade no meio e limitada na ponta', () => {
    const curve = limiterCurve()
    const mid = curve[Math.floor(curve.length / 2)] ?? 1
    const full = curve[curve.length - 1] ?? 0

    expect(mid, 'silêncio no centro da curva').toBeCloseTo(0, 5)
    expect(full, 'pico encosta sem passar de 1').toBeCloseTo(0.9642391233933647)
  })

  it('o nivelador desligado cola em 1 e o ligado não amplifica silêncio', () => {
    expect(nextLevelerGain(2, 0.05, false)).toBe(1)
    expect(nextLevelerGain(2, 0, true), 'silêncio volta um passo para 1').toBe(1.92)
    expect(nextLevelerGain(1, 0.05, true), 'voz baixa sobe um passo até o alvo 2').toBe(1.08)
    expect(nextLevelerGain(1, 0.5, true), 'voz alta desce um passo até o piso 0,25').toBe(0.94)
    expect(preSliderRms(0.4, 4), 'o slider não entra na conta do nivelador').toBeCloseTo(0.1)
    expect(preSliderRms(0.4, 0), 'slider mudo não divide por zero').toBe(0.4)
    expect(preSliderRms(0.4, Number.NaN)).toBe(0.4)
    expect(preSliderRms(Number.NaN, 2)).toBe(0)
    expect(limiterAttenuation(Number.NaN)).toBe(0)
    expect(limiterAttenuation(2)).toBeCloseTo(0.5178804383033176)
    expect(softLimitSample(2)).toBeCloseTo(0.9642391233933647)
    expect(softLimitSample(-2)).toBeCloseTo(-0.9642391233933647)
  })

  it('contexto já rodando não pede resume e o analyser fica na derivação', () => {
    vi.stubGlobal('MediaStream', class {
      constructor(readonly tracks: readonly MediaStreamTrack[]) {}
    })
    const context = new FakeAudioContext()
    context.state = 'running'
    const chain = createMicChain(context as unknown as AudioContext, fakeMediaTrack(1), 1)

    expect(context.resumed).toBe(0)
    expect(chain.samples, '2048 cobre os 32 ms entre leituras').toHaveLength(2048)
    expect(chain.samples).toBeInstanceOf(Float32Array)
    expect(context.gains[1]?.links).toContain(context.analysers[0])
    expect(context.shapers[0]?.links).toEqual([context.gains[2]])
    const scheduled = context.gains[0]?.gain.scheduled.length ?? 0
    followLeveler(chain, 0.5, false)
    expect(context.gains[0]?.gain.scheduled).toHaveLength(scheduled)
    expect(chain.levelerGain).toBe(1)
    vi.unstubAllGlobals()
  })

  it('voz baixa não vira o −45 dB do byte: o nível em float segue o sinal', () => {
    for (const db of [-70, -60, -50]) {
      const amplitude = 10 ** (db / 20) * Math.SQRT2
      const wave = Float32Array.from({ length: 2048 }, (_, index) => amplitude * Math.sin(index * 0.37))
      expect(rmsToDb(floatRms(wave)), `${db} dB`).toBeCloseTo(db, 0)
    }
    expect(floatRms(new Float32Array([0.5, -0.5]))).toBe(0.5)
    expect(floatRms(new Float32Array())).toBe(0)
  })

  it('o portão abre em 5 ms e fecha em rampa de 30 ms', () => {
    const param = new FakeAudioParam()
    aimGateOpen(param, true, 2)
    aimGateOpen(param, false, 3)
    expect(param.targets).toEqual([
      { value: 1, time: 2, timeConstant: 0.005 },
      { value: 0, time: 3, timeConstant: 0.03 },
    ])
  })

  it('a leitura da cadeia usa o float do analyser', () => {
    vi.stubGlobal('MediaStream', class {
      constructor(readonly tracks: readonly MediaStreamTrack[]) {}
    })
    const context = new FakeAudioContext()
    const chain = createMicChain(context as unknown as AudioContext, fakeMediaTrack(1), 1)
    const analyser = context.analysers[0]
    if (analyser) analyser.fill = 192
    expect(readChainRms(chain)).toBe(0.5)
    vi.unstubAllGlobals()
  })
})
