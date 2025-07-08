# Script to fix user-collection test file
$filePath = "src\user-collection\user-collection.service.spec.ts"
$content = Get-Content $filePath -Raw

# Replace remaining ReqType references with strings
$content = $content -replace 'ReqType\.REST', '"REST"'
$content = $content -replace 'ReqType\.GQL', '"GQL"'

# Add userUid to all DBUserCollection objects that are missing it
$content = $content -replace '(const \w+: DBUserCollection = \{[^}]*title: ''[^'']*'',)', '$1`n  userUid: user.uid,'

# Add orderIndex to all UserCollection (casted) objects that are missing it
$content = $content -replace '(const \w+Casted: UserCollection = \{[^}]*data: [^,]*,)', '$1`n  orderIndex: \d+,'

# Remove userUid from all UserCollection array objects
$content = $content -replace '(\s+)userUid: user\.uid,(\s+)', '$2'

# Fix property access (remove .userUid access on UserCollection objects)
$content = $content -replace '(\w+Casted\[\d+\])\.userUid', '$1.id'  # Use id instead of userUid for UserCollection
$content = $content -replace '(\w+Casted)\.userUid', '$1.id'

Set-Content -Path $filePath -Value $content
Write-Host "Fixed test file"
