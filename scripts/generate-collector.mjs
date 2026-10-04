import { readFile, writeFile } from "node:fs/promises";
const collector = await readFile(
  new URL("../public/detect-hardware.ps1", import.meta.url),
  "utf8",
);
const body = collector
  .replace("param([string]$OutputPath)", "")
  .replace(
    "else { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Write-Output $json }",
    "else { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) }",
  );
const payload = `try {
${body}
if ($env:GC_TEST_MODE -eq '1') { Write-Output $json; exit 0 }
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)).TrimEnd('=').Replace('+','-').Replace('/','_')
Start-Process ('https://gaming-copilot.vercel.app/#hardware=' + $encoded)
Write-Host 'Inventaire termine. Retrouvez le resultat dans Gaming Copilot.'
} catch { Write-Host 'La detection a echoue. Aucune protection Windows ne sera modifiee.'; if ($env:GC_TEST_MODE -ne '1') { Read-Host 'Appuyez sur Entree pour fermer' }; exit 1 }
`;
const launcher = `@echo off
setlocal
title Gaming Copilot - Identification du PC
set "GC_LAUNCHER=%~f0"
echo Lecture du materiel puis retour automatique sur Gaming Copilot...
echo Aucun numero de serie collecte. Aucun programme installe.
powershell.exe -NoLogo -NoProfile -Command "$raw=[IO.File]::ReadAllText($env:GC_LAUNCHER); $marker='#'+' GC_POWERSHELL_START'; & ([scriptblock]::Create($raw.Substring($raw.LastIndexOf($marker)+$marker.Length)))"
exit /b %errorlevel%
# GC_POWERSHELL_START
${payload}`;
await writeFile(
  new URL("../public/gaming-copilot-detect.cmd", import.meta.url),
  launcher.replace(/\r?\n/g, "\r\n"),
  "utf8",
);
