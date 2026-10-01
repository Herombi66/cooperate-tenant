Add-Type -AssemblyName System.Drawing

$srcPath = "imanmcs-frontend\public\fmck-logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath).Path)

function Resize-Image($source, $width, $height, $outputPath) {
    $dest = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, 0, 0, $width, $height)
    $g.Dispose()
    
    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Generated $outputPath ($width x $height)"
}

# 1. Generate resized PNGs
Resize-Image $srcImage 16 16 "imanmcs-frontend\public\favicon-16x16.png"
Resize-Image $srcImage 32 32 "imanmcs-frontend\public\favicon-32x32.png"
Resize-Image $srcImage 48 48 "imanmcs-frontend\public\favicon-48x48.png"
Resize-Image $srcImage 180 180 "imanmcs-frontend\public\apple-touch-icon.png"
Resize-Image $srcImage 192 192 "imanmcs-frontend\public\android-chrome-192x192.png"
Resize-Image $srcImage 512 512 "imanmcs-frontend\public\android-chrome-512x512.png"

# 2. Generate a valid multi-icon ICO file from 16, 32, 48 PNGs
# We can construct the ICO binary with embedded PNG streams (standard since Vista & supported everywhere)
$png16Bytes = [System.IO.File]::ReadAllBytes("imanmcs-frontend\public\favicon-16x16.png")
$png32Bytes = [System.IO.File]::ReadAllBytes("imanmcs-frontend\public\favicon-32x32.png")
$png48Bytes = [System.IO.File]::ReadAllBytes("imanmcs-frontend\public\favicon-48x48.png")

$icoFile = "imanmcs-frontend\public\favicon.ico"
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# ICONDIR header: Reserved (0), Type (1 = ICO), Count (3)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]3)

$offset = 6 + (16 * 3) # Header (6) + 3 entries (48) = 54 bytes

# Entry 1: 16x16
$bw.Write([byte]16) # width
$bw.Write([byte]16) # height
$bw.Write([byte]0)  # colors
$bw.Write([byte]0)  # reserved
$bw.Write([uint16]1) # planes
$bw.Write([uint16]32) # bpp
$bw.Write([uint32]$png16Bytes.Length)
$bw.Write([uint32]$offset)
$offset += $png16Bytes.Length

# Entry 2: 32x32
$bw.Write([byte]32)
$bw.Write([byte]32)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([uint16]1)
$bw.Write([uint16]32)
$bw.Write([uint32]$png32Bytes.Length)
$bw.Write([uint32]$offset)
$offset += $png32Bytes.Length

# Entry 3: 48x48
$bw.Write([byte]48)
$bw.Write([byte]48)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([uint16]1)
$bw.Write([uint16]32)
$bw.Write([uint32]$png48Bytes.Length)
$bw.Write([uint32]$offset)

# Write image data
$bw.Write($png16Bytes)
$bw.Write($png32Bytes)
$bw.Write($png48Bytes)

[System.IO.File]::WriteAllBytes($icoFile, $ms.ToArray())
$bw.Close()
$ms.Close()
$srcImage.Dispose()

Write-Host "Generated valid multi-size favicon.ico successfully!"
