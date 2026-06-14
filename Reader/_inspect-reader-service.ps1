$asm = [Reflection.Assembly]::LoadFrom(''c:\Users\joelz\Dokumente\Reader\Dependencies\ReaderService\ReaderService.dll'')
$asm.GetTypes() | Where-Object { $_.Name -match ''ReaderService|Power|Regulation|GPIO'' } | ForEach-Object {
    Write-Output ('TYPE ' + $_.FullName)
    $_.GetMethods([System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::Instance -bor [System.Reflection.BindingFlags]::Static -bor [System.Reflection.BindingFlags]::DeclaredOnly) |
        Sort-Object Name |
        ForEach-Object { Write-Output ('  ' + $_.Name) }
}
