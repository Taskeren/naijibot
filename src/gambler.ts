import { Env } from ".";

async function setGamblerToken(gamblerId: string, value: number, env: Env) {
    await env.naiji_bot.put(`usertoken-${gamblerId}`, value.toString())
}

async function getGamblerToken(gamblerId: string, env: Env): Promise<number> {
    const tokenStr = await env.naiji_bot.get(`usertoken-${gamblerId}`);
    return tokenStr == null ? 0 : Number.parseInt(tokenStr);
}

export {
    setGamblerToken,
    getGamblerToken
}