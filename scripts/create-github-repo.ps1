param(
    [string]$RepoName = "svnpedidos",
    [string]$Description = "Projeto do site svnpedidos",
    [ValidateSet("private","public")]
    [string]$Visibility = "private",
    [string]$Org = $null
)

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Error "GITHUB_TOKEN não encontrado no ambiente. Defina-o e execute novamente."
    exit 1
}

$headers = @{
    Authorization = "token $token"
    Accept        = "application/vnd.github.v3+json"
    "User-Agent"  = "TraeAI-Assistant"
}

try {
    $me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
} catch {
    Write-Error "Falha ao obter usuário do GitHub. Verifique o token."
    exit 1
}

$owner = if ($Org) { $Org } else { $me.login }

$repoUrl = "https://api.github.com/repos/$owner/$RepoName"
$exists = $false
try {
    $existing = Invoke-RestMethod -Uri $repoUrl -Headers $headers -Method Get
    $exists = $true
} catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
        $exists = $false
    } else {
        Write-Warning "Não foi possível verificar existência do repositório: $($_.Exception.Message)"
    }
}

if ($exists) {
    Write-Host "Repositório já existe: https://github.com/$owner/$RepoName"
    return
}

$privateFlag = $true
if ($Visibility -eq "public") { $privateFlag = $false }

$body = @{
    name        = $RepoName
    description = $Description
    private     = $privateFlag
} | ConvertTo-Json

$endpoint = if ($Org) {
    "https://api.github.com/orgs/$Org/repos"
} else {
    "https://api.github.com/user/repos"
}

try {
    $created = Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Post -Body $body
    Write-Host "Repositório criado com sucesso!"
    Write-Host ("Página: https://github.com/{0}" -f $created.full_name)
    Write-Host ("Clone:  {0}" -f $created.clone_url)
} catch {
    Write-Error ("Falha ao criar repositório: {0}" -f $_.Exception.Message)
    if ($_.ErrorDetails.Message) { Write-Error $_.ErrorDetails.Message }
    exit 1
}