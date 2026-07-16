$b = Get-Content "D:\Vox\frontend\dist\assets\index-DxU15CdG.js" -Raw -Encoding UTF8
"__VOX_START found: " + ($b.IndexOf("__VOX_START"))
"vox_access found: " + ($b.IndexOf("vox_access"))
"vox-sw-killed found: " + ($b.IndexOf("vox-sw-killed"))
"serviceWorker found: " + ($b.IndexOf("serviceWorker"))
"register sw.js found: " + ($b.IndexOf('register("/sw'))
"Electron does not: " + ($b.IndexOf("Electron does not"))
"removeItem vox_access: " + ($b.IndexOf("removeItem(`"vox_access`")"))
$idx = $b.IndexOf("__VOX_START")
if ($idx -gt 0) { "Marker context: " + $b.Substring([Math]::Max(0,$idx-50), 200) }
$idx2 = $b.IndexOf("vox_access")
if ($idx2 -gt 0) { "First vox_access context: " + $b.Substring([Math]::Max(0,$idx2-100), 300) }
