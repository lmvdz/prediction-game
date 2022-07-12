"use strict";

import { exec } from "child_process";

const isWin = process.platform === "win32";

if (isWin) {
    exec('(if exist lib ( rmdir /s /q lib )) && tsc');
} else {
    exec('[ -d "../target" ] && ( rm -rf ./src/idl/* && cp ../target/idl/*.json ./src/idl/ )')
    exec('[ -d "../target" ] && ( rm -rf ./src/types/* && cp ../target/types/*.ts ./src/types/ )')
    exec('rm -rf lib && tsc');
}