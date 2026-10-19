# Libera no Firewall do Windows as portas do Radcord, aceitando conexoes SO da rede do Radmin (26.0.0.0/8).
# Precisa ser executado como Administrador.
$ErrorActionPreference = 'Stop'

$ruleGroup = 'Radcord'
$radminRange = '26.0.0.0/8'

function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Abra o PowerShell como Administrador e rode: npm run host:firewall'
    }
}

function Add-RadcordRule($name, $protocol, $ports) {
    New-NetFirewallRule -Group $ruleGroup -DisplayName "Radcord - $name" -Direction Inbound -Action Allow `
        -Protocol $protocol -LocalPort $ports -RemoteAddress $radminRange -Profile Any | Out-Null
    Write-Host "Liberado: $name ($protocol $ports)"
}

Assert-Administrator
Remove-NetFirewallRule -Group $ruleGroup -ErrorAction SilentlyContinue
Add-RadcordRule 'API do host' 'TCP' '3000'
Add-RadcordRule 'LiveKit sinalizacao' 'TCP' @('7880', '7881')
Add-RadcordRule 'LiveKit midia' 'UDP' '50000-50100'
Write-Host 'Firewall pronto.' -ForegroundColor Green
