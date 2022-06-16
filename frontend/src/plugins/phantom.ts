async function phantom() {
  while (!window.hasOwnProperty('solana')) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
// @ts-ignore
export default async ({ app }, inject) => {
  const wallet = await phantom()
  inject('phantom', wallet)
}
