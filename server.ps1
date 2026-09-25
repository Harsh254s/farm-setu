# FarmSetu Local HTTP Web Server
# Uses built-in .NET HttpListener - Robust & self-recovering

$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

$baseDir = $PSScriptRoot

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  🌱 FarmSetu Server Running at $prefix                    " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            # Support CORS
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")

            $urlPath = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($urlPath)) {
                $urlPath = "index.html"
            }

            $filePath = Join-Path $baseDir $urlPath

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $response.ContentType = $mime

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length

                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                $response.StatusCode = 200
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            }

            $response.OutputStream.Close()
        } catch {
            # Client disconnects or HEAD request socket resets are safely caught and ignored
        }
    }
} catch {
    Write-Host "Server startup error: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
