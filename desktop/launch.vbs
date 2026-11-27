Option Explicit
Dim shell, fso, base, runtimePath, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
runtimePath = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
If Not fso.FileExists(runtimePath) Then
  runtimePath = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
End If
If Not fso.FileExists(runtimePath) Then
  MsgBox "Node.js runtime was not found. Please restore the project runtime.", 16, "Smart Accessible Travel"
  WScript.Quit 1
End If
shell.CurrentDirectory = fso.GetParentFolderName(base)
exitCode = shell.Run(Chr(34) & runtimePath & Chr(34) & " " & Chr(34) & base & "\launch.mjs" & Chr(34), 0, True)
If exitCode <> 0 Then
  MsgBox "The app could not start. Please check desktop\desktop.log.", 16, "Smart Accessible Travel"
End If
