import { exec } from "child_process";

let loop = () => {
    exec('solana airdrop 1 --url devnet', (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
    })
    setTimeout(() => {
        loop();
    }, 30 * 1000)
}

loop();
