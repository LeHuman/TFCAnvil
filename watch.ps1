npm update;
$a = start-process -NoNewWindow powershell {
    while ($True) {
        if ((Get-Item .\script.js).LastWriteTime -ne $LastWriteTime) {
            npx esbuild script.js --bundle --outfile=main.js --minify --platform=node;
            $LastWriteTime = (Get-Item .\script.js).LastWriteTime;
            Sleep 1;
        }
    }
} -PassThru
npx live-server;