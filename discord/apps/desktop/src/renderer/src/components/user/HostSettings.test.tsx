import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HOST_UNAVAILABLE, type HostSnapshot } from '../../../../shared/hostSnapshot'
import { HOST_ERROR, stopWarning } from '../../../../main/host/hostMessages'
import { HostLaunchControl } from '../auth/HostLaunchControl'
import { HostQuitModal } from './HostQuitModal'
import { HostSettingsPanel } from './HostSettings'

const noop = (): void => undefined

function snapshot(patch: Partial<HostSnapshot>): HostSnapshot {
  return { ...HOST_UNAVAILABLE, moduleReady: true, phase: 'off', ...patch }
}

describe('telas do host', () => {
  it('sem módulo a tela de entrar não mostra o botão', () => {
    const html = renderToStaticMarkup(
      <HostLaunchControl snapshot={HOST_UNAVAILABLE} onStart={noop} onUseAddress={noop} />,
    )

    expect(html).toBe('')
  })

  it('na entrada o botão liga o host e o host de fora só oferece o IP', () => {
    const off = renderToStaticMarkup(<HostLaunchControl snapshot={snapshot({})} onStart={noop} onUseAddress={noop} />)
    const external = renderToStaticMarkup(
      <HostLaunchControl
        snapshot={snapshot({ phase: 'external', radminIp: '26.186.21.58', message: HOST_ERROR.externalStop })}
        onStart={noop}
        onUseAddress={noop}
      />,
    )

    expect(off).toContain('Ligar host neste PC')
    expect(off).toContain('button button--primary')
    expect(off).not.toContain('Desligar')
    expect(external).toContain('Usar o host que já está no ar (26.186.21.58)')
    expect(external).toContain(HOST_ERROR.externalStop)
    expect(external).not.toContain('Desligar host')
  })

  it('em configurações o desligar mostra a contagem e o externo não tem botão', () => {
    const on = renderToStaticMarkup(
      <HostSettingsPanel
        snapshot={snapshot({ phase: 'on', ownedByApp: true, radminIp: '26.186.21.58', online: 2, inVoice: 1, apiLog: ['api-pronta'], livekitLog: [] })}
        preview={{ allowed: true, online: 2, inVoice: 1, message: stopWarning(2, 1) }}
        onStart={noop}
        onAskStop={noop}
        onConfirmStop={noop}
        onCancelStop={noop}
        onCheckFirewall={noop}
        onOpenFirewall={noop}
      />,
    )
    const external = renderToStaticMarkup(
      <HostSettingsPanel
        snapshot={snapshot({ phase: 'external', radminIp: '26.186.21.58', online: 1, inVoice: 0 })}
        preview={null}
        onStart={noop}
        onAskStop={noop}
        onConfirmStop={noop}
        onCancelStop={noop}
        onCheckFirewall={noop}
        onOpenFirewall={noop}
      />,
    )

    expect(on).toContain('Ligado · 26.186.21.58')
    expect(on).toContain('2 pessoas online, 1 na call')
    expect(on).toContain('Desligar derruba a call de todos. Agora: 2 pessoas online e 1 na call.')
    expect(on).toContain('Desligar mesmo assim')
    expect(on).toContain('api-pronta')
    expect(on).toContain('Sem linhas ainda.')
    expect(on).toContain('Liberar portas no firewall')
    expect(on).toContain('button button--danger')
    expect(on).toContain('button button--secondary')
    expect(on).not.toContain('class="button"')
    expect(external).toContain('Ligado fora do app')
    expect(external).toContain('O app não desliga um host que foi aberto no terminal.')
    expect(external).not.toContain('Desligar host')
  })

  it('fechar o app repete a frase e a contagem', () => {
    const html = renderToStaticMarkup(
      <HostQuitModal
        prompt={{ online: 2, inVoice: 1, message: 'Fechar o SoundRoom desliga o host e derruba a call de 2 pessoas online (1 na call).' }}
        onConfirm={noop}
        onDismiss={noop}
      />,
    )

    expect(html).toContain('Fechar o SoundRoom desliga o host e derruba a call de 2 pessoas online (1 na call).')
    expect(html).toContain('2 pessoas online, 1 na call.')
    expect(html).toContain('Fechar e desligar')
    expect(html).toContain('Continuar com o host ligado')
  })
})
