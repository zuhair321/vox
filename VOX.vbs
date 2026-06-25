Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\vox"

' Kill any old node processes first (best-effort, ignore errors if none running)
On Error Resume Next
WshShell.Run "cmd /c taskkill /F /IM node.exe >nul 2>&1", 0, True
On Error Goto 0
WScript.Sleep 1500

' NOTE: Backend (port 4000) and frontend (port 3000) are spawned by
' electron-main.js itself. Do NOT spawn them here - that caused a double
' backend and the EADDRINUSE error on port 4000.

' Launch Electron (electron-main.js spawns the servers on 4000 + 3000).
' Prefer the real electron.exe - the .cmd shim dies when launched via WshShell.Run.
If CreateObject("Scripting.FileSystemObject").FileExists("C:\vox\node_modules\electron\dist\electron.exe") Then
    WshShell.Run """C:\vox\node_modules\electron\dist\electron.exe"" ""C:\vox\electron-main.js""", 1, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("C:\vox\electron\electron.exe") Then
    WshShell.Run """C:\vox\electron\electron.exe"" ""C:\vox\electron-main.js""", 1, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("C:\vox\node_modules\.bin\electron.cmd") Then
    WshShell.Run "cmd /c """"C:\vox\node_modules\.bin\electron.cmd"""" ""C:\vox\electron-main.js""""", 1, False
Else
    MsgBox "Electron not found. Run install-and-run-desktop.bat first.", 48, "VOX Desktop"
End If

Set WshShell = Nothing
