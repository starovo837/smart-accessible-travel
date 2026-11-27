Option Explicit
Dim shell, fso, base, shortcut, desktopPath, appName
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
desktopPath = shell.SpecialFolders("Desktop")
appName = ChrW(26234) & ChrW(33021) & ChrW(26080) & ChrW(30861) & ChrW(34892)
Set shortcut = shell.CreateShortcut(desktopPath & "\" & appName & ".lnk")
shortcut.TargetPath = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\wscript.exe"
shortcut.Arguments = Chr(34) & base & "\launch.vbs" & Chr(34)
shortcut.WorkingDirectory = fso.GetParentFolderName(base)
shortcut.Description = "Launch local accessible travel app"
If fso.FileExists(base & "\app.ico") Then shortcut.IconLocation = base & "\app.ico"
shortcut.Save
If WScript.Arguments.Count = 0 Then MsgBox "Desktop shortcut created. Double-click it to start the app.", 64, "Smart Accessible Travel"
