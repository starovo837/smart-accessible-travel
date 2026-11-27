function ConvertTo-ModelScopeToken {
  param([AllowNull()][AllowEmptyString()][string]$Value)
  if($null -eq $Value){return $null}
  $normalized=$Value -replace '^[\s\u200b]+|[\s\u200b]+$',''
  if($normalized.Length -gt 4096 -or $normalized -cnotmatch '^[-A-Za-z0-9._~+/]{8,}=*$'){return $null}
  return $normalized
}

function Read-ModelScopeTokenDialog {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $form=New-Object System.Windows.Forms.Form
  $form.Text='智能无碍行 · 魔搭令牌输入'
  $form.ClientSize=New-Object System.Drawing.Size(660,320)
  $form.StartPosition='CenterScreen'
  $form.FormBorderStyle='FixedDialog'
  $form.MaximizeBox=$false
  $form.MinimizeBox=$false
  $form.TopMost=$false
  $form.Font=New-Object System.Drawing.Font('Microsoft YaHei UI',11)

  $label=New-Object System.Windows.Forms.Label
  $label.Location=New-Object System.Drawing.Point(24,20)
  $label.Size=New-Object System.Drawing.Size(610,100)
  $label.Text="在魔搭访问令牌页，点击令牌右侧的重叠方框复制图标。`r`n将令牌粘贴到下方，再点「继续配置」。`r`n输入会隐藏，仅用于当前本机操作，不写入文件。"

  $box=New-Object System.Windows.Forms.TextBox
  $box.Location=New-Object System.Drawing.Point(24,128)
  $box.Size=New-Object System.Drawing.Size(610,38)
  $box.Font=New-Object System.Drawing.Font('Segoe UI',16)
  $box.UseSystemPasswordChar=$true
  $box.MaxLength=8192
  $box.AccessibleName='魔搭访问令牌，仅在本机使用'

  $errorLabel=New-Object System.Windows.Forms.Label
  $errorLabel.Location=New-Object System.Drawing.Point(24,178)
  $errorLabel.Size=New-Object System.Drawing.Size(610,60)
  $errorLabel.ForeColor=[System.Drawing.Color]::DarkRed
  $errorLabel.AccessibleRole='Alert'

  $submit=New-Object System.Windows.Forms.Button
  $submit.Location=New-Object System.Drawing.Point(374,256)
  $submit.Size=New-Object System.Drawing.Size(126,44)
  $submit.Text='继续配置'
  $submit.Add_Click({
    $normalized=ConvertTo-ModelScopeToken $box.Text
    if([string]::IsNullOrEmpty($normalized)){
      $errorLabel.Text='尚未发送。请用令牌旁的复制图标重新复制；遮盖圆点、网址或提示文字不是令牌。'
      $box.SelectAll()
      [void]$box.Focus()
      return
    }
    $form.Tag=$normalized
    $box.Clear()
    $form.DialogResult=[System.Windows.Forms.DialogResult]::OK
    $form.Close()
  })

  $cancel=New-Object System.Windows.Forms.Button
  $cancel.Location=New-Object System.Drawing.Point(514,256)
  $cancel.Size=New-Object System.Drawing.Size(120,44)
  $cancel.Text='取消'
  $cancel.DialogResult=[System.Windows.Forms.DialogResult]::Cancel
  $form.AcceptButton=$submit
  $form.CancelButton=$cancel
  $form.Controls.AddRange(@($label,$box,$errorLabel,$submit,$cancel))
  $form.Add_Shown({[void]$box.Focus()})
  try{
    $result=$form.ShowDialog()
    if($result -eq [System.Windows.Forms.DialogResult]::OK){return [string]$form.Tag}
    return $null
  }finally{
    $box.Clear()
    $form.Tag=$null
    $form.Dispose()
  }
}
