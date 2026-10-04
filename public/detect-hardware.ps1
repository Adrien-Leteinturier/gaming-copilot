# Gaming Copilot: read-only inventory. No serial numbers, account names or network identifiers.
# Without OutputPath, the report is written to standard output for the local scanner.
param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$warnings = [System.Collections.Generic.List[string]]::new()
function Get-HardwareRows([string]$className, [string[]]$properties) {
    try { @(Get-CimInstance -ClassName $className -Property $properties -ErrorAction Stop) }
    catch { $warnings.Add("Unable to read $className. The corresponding fields need review."); @() }
}
function Join-Reference($values) {
    $clean = @($values | ForEach-Object { if ($_ -and "$($_)".Trim()) { "$($_)".Trim() } } | Select-Object -Unique)
    if ($clean.Count -eq 0) { return $null }
    $text = $clean -join ' / '
    if ($text.Length -gt 150) { $warnings.Add('A reference list was shortened. Review multi-device configurations.'); return $text.Substring(0, 147) + '...' }
    return $text
}
$cpus = Get-HardwareRows 'Win32_Processor' @('Name')
$gpus = Get-HardwareRows 'Win32_VideoController' @('Name')
$boards = Get-HardwareRows 'Win32_BaseBoard' @('Manufacturer', 'Product')
$memory = Get-HardwareRows 'Win32_PhysicalMemory' @('Capacity', 'ConfiguredClockSpeed', 'SMBIOSMemoryType')
$disks = Get-HardwareRows 'Win32_DiskDrive' @('Model', 'Size', 'InterfaceType')
$cpu = Join-Reference @($cpus | ForEach-Object { $_.Name })
$gpu = Join-Reference @($gpus | ForEach-Object { $_.Name })
$motherboard = Join-Reference @($boards | ForEach-Object { "$($_.Manufacturer) $($_.Product)" })
$ram = $null
if ($memory.Count -gt 0) {
    $capacity = ($memory | Measure-Object -Property Capacity -Sum).Sum
    if ($capacity -gt 0) {
        $gib = [Math]::Round($capacity / 1GB, 1)
        $types = Join-Reference @($memory | ForEach-Object { switch ($_.SMBIOSMemoryType) { 24 { 'DDR3' }; 26 { 'DDR4' }; 34 { 'DDR5' } } })
        $ram = "$gib GiB ($($memory.Count) modules)"
        if ($types) { $ram += " $types" }
    }
}
$storage = Join-Reference @($disks | Where-Object { $_.InterfaceType -ne 'USB' } | ForEach-Object {
    if ($_.Size -gt 0) { "$($_.Model) ($([Math]::Round($_.Size / 1GB)) GiB)" } else { $_.Model }
})
if (@($gpus).Count -gt 1) { $warnings.Add('Multiple display adapters detected. Check which GPU your games use.') }
$warnings.Add('Power supply model and wattage cannot be reliably read through Windows CIM.')
$report = [ordered]@{
    version = 1
    platform = 'windows'
    detectedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    components = [ordered]@{ cpu = $cpu; gpu = $gpu; motherboard = $motherboard; ram = $ram; storage = $storage; psu = $null }
    warnings = @($warnings.ToArray())
}
$json = $report | ConvertTo-Json -Depth 5
if ($OutputPath) {
    [System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath($OutputPath), $json, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Hardware report saved to $OutputPath"
} else { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Write-Output $json }
