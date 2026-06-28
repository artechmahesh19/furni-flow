$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Listening on http://localhost:8000/ ..."
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        try {
            $path = $request.Url.LocalPath
            if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }
            $cleanedPath = $path.Replace('/', [System.IO.Path]::DirectorySeparatorChar).TrimStart([System.IO.Path]::DirectorySeparatorChar)
            $localFile = Join-Path "C:\Users\HR\.gemini\antigravity\scratch" $cleanedPath
            if (Test-Path $localFile -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($localFile)
                $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".gif"  { "image/gif" }
                    default { "application/octet-stream" }
                }
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
                $response.ContentType = "text/plain"
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            Write-Host "Error handling request: $_"
            $response.StatusCode = 500
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}
