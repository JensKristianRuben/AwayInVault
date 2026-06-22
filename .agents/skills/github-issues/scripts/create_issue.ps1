param (
    [Parameter(Mandatory=$true)]
    [string]$Title,

    [Parameter(Mandatory=$true)]
    [string]$Body,

    [Parameter(Mandatory=$false)]
    [string]$Labels
)

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is not installed or not in PATH. Please install it to use this skill."
    exit 1
}

# Verify authentication status
gh auth status > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not authenticated with gh CLI. Please run 'gh auth login' to authenticate."
    exit 1
}

# Construct arguments
$argsList = @("issue", "create", "--title", $Title, "--body", $Body)

if (-not [string]::IsNullOrEmpty($Labels)) {
    $argsList += @("--label", $Labels)
}

# Run the command
Write-Host "Creating GitHub issue: '$Title'..."
& gh $argsList
