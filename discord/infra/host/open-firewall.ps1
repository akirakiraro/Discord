# Libera no Firewall do Windows as portas do SoundRoom, aceitando conexoes SO da rede do Radmin (26.0.0.0/8).
# Precisa ser executado como Administrador.
$ErrorActionPreference = 'Stop'

$ruleGroup = 'SoundRoom'
$radminRange = '26.0.0.0/8'

function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Abra o PowerShell como Administrador e rode: npm run host:firewall'
    }
}

function Add-SoundRoomRule($name, $protocol, $ports) {
    New-NetFirewallRule -Group $ruleGroup -DisplayName "SoundRoom - $name" -Direction Inbound -Action Allow `
        -Protocol $protocol -LocalPort $ports -RemoteAddress $radminRange -Profile Any | Out-Null
    Write-Host "Liberado: $name ($protocol $ports)"
}

Assert-Administrator
# O grupo antigo se chamava Radcord. Remove os dois para não duplicar regra.
Remove-NetFirewallRule -Group 'Radcord' -ErrorAction SilentlyContinue
Remove-NetFirewallRule -Group $ruleGroup -ErrorAction SilentlyContinue
Add-SoundRoomRule 'API do host' 'TCP' '3000'
Add-SoundRoomRule 'LiveKit sinalizacao' 'TCP' @('7880', '7881')
Add-SoundRoomRule 'LiveKit midia' 'UDP' '50000-50100'
Write-Host 'Firewall pronto.' -ForegroundColor Green
