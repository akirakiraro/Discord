import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { APP_USER_MODEL_ID, PRODUCT_DISPLAY_NAME } from '../shared/appIdentity'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('identidade empacotada', () => {
  const pkg = JSON.parse(readFileSync(join(desktopRoot, 'package.json'), 'utf8')) as {
    productName: string
    build: {
      appId: string
      productName: string
      nsis: {
        artifactName: string
        shortcutName: string
        installerIcon: string
        installerHeaderIcon: string
        oneClick: boolean
      }
      publish: { owner: string; repo: string }
      win: { icon: string }
    }
  }

  it('mostra SoundRoom e não troca o que o updater e o registro já conhecem', () => {
    expect(pkg.productName).toBe(PRODUCT_DISPLAY_NAME)
    expect(pkg.build.productName).toBe(PRODUCT_DISPLAY_NAME)
    expect(pkg.build.appId).toBe(APP_USER_MODEL_ID)
    expect(pkg.build.nsis.shortcutName).toBe(PRODUCT_DISPLAY_NAME)
    expect(pkg.build.nsis.artifactName).toBe('Radcord-Setup-${version}.${ext}')
    expect(pkg.build.nsis.oneClick).toBe(true)
    expect(pkg.build.nsis.installerIcon).toBe('icon.ico')
    expect(pkg.build.nsis.installerHeaderIcon).toBe('icon.ico')
    expect(pkg.build.publish).toMatchObject({ owner: 'akirakiraro', repo: 'Discord' })
    expect(pkg.build.win.icon).toBe('build/icon.ico')
  })

  it('marca a janela do NSIS sem trocar o contrato do updater', () => {
    const script = readFileSync(join(desktopRoot, 'build/installer.nsh'), 'utf8')

    expect(script).toContain('Radcord.lnk')
    expect(script).toContain('LANG_PORTUGUESEBR')
    expect(script).toContain('Instalando o SoundRoom. Ele abre sozinho em seguida.')
    expect(script).not.toContain('LangString')
  })

  it('guarda o svg e os tamanhos que o electron-builder embute', () => {
    const buildDir = join(desktopRoot, 'build')
    expect(existsSync(join(buildDir, 'icon.svg')), 'icon.svg').toBe(true)
    expect(existsSync(join(buildDir, 'icon.png')), 'icon.png').toBe(true)
    expect(existsSync(join(buildDir, 'icon-512.png')), 'icon-512.png').toBe(true)
    expect(existsSync(join(buildDir, 'icon.ico')), 'icon.ico').toBe(true)
  })
})
