Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\alwii\Desktop\tailshare"
WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""C:\Users\alwii\Desktop\tailshare\start-tailshare.ps1""", 0, False
