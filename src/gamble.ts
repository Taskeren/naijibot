import { Env } from ".";
import { getGamblerToken, setGamblerToken } from './gambler'

export interface Gambling {
    id: number,
    content: string
    gamblers: Bet[] // ID和投注的赌注

    // 固定答案模式下的答案列表
    enumAnswers?: string[]
}

export interface Bet {
    gamblerId: string
    tokenOnBet: number
    // 非固定答案模式下的答案
    answerForBet?: string
    // 固定答案模式下选择的答案
    enumAnswerIndexForBet?: number
}

// 基本数据读取和存储

/**
 * 返回目前可用的赌局ID
 * @param env the env
 * @returns id list of available gamblings
 */
async function getAvailableGamblings(env: Env): Promise<number[]> {
    const availableGambleJson = await env.naiji_bot.get("available-gamblings")
    const availableGamble = availableGambleJson == null ? [] : JSON.parse(availableGambleJson)

    if(Array.isArray(availableGamble)) {
        return availableGamble
    } else {
        console.warn(`Invalid 'availableGambleJson': ${availableGambleJson}`)
        return [];
    }
}

async function putAvailableGamblings(gamblings: number[], env: Env) {
    await env.naiji_bot.put("available-gamblings", JSON.stringify(gamblings))
}

async function getGambling(id: number, env: Env): Promise<Gambling> {
    const gambleJson = await env.naiji_bot.get(`gambling-data-${id}`)
    return gambleJson == null ? null : JSON.parse(gambleJson);
}

async function putGambling(gamble: Gambling, env: Env) {
    const gambleJson = JSON.stringify(gamble)
    await env.naiji_bot.put(`gambling-data-${gamble.id}`, gambleJson)
}

async function removeGambling(gamble: Gambling, env: Env) {
    await env.naiji_bot.delete(`gambling-data-${gamble.id}`)
}

// 管理数据

async function createNewGambling(content: string, env: Env, enumAnswers?: string[]): Promise<Gambling> {
    let gambling: Gambling = {
        id: await bumpLastIdAndGet(env),
        content,
        gamblers: [],
        enumAnswers
    }
    await putGambling(gambling, env)
    await addAvailableGambling(gambling.id, env)
    return gambling
}

function isEnumAnswer(gambling: Gambling): boolean {
    return gambling.enumAnswers != null
}

function getEnumAnswer(gambling: Gambling): string[] | null {
    return gambling.enumAnswers ?? null
}

function getEnumAnswerIndexFor(answer: string, gambling: Gambling): number | null {
    if(isEnumAnswer(gambling)) {
        let index = gambling.enumAnswers?.findIndex(x => x == answer) ?? null
        return index == null ? null : index < 0 ? null : index
    } else {
        return null
    }
}

async function destroyGambling(gambling: Gambling, env: Env) {
    await removeGambling(gambling, env)
    await removeAvailableGambling(gambling.id, env)
}

// 管理 ID

async function setLastId(id: number, env: Env) {
    await env.naiji_bot.put("last-gambling-id", id.toString())
}

async function getLastId(env: Env): Promise<number> {
    const lastId = await env.naiji_bot.get("last-gambling-id")
    return lastId == null ? 0 : Number.parseInt(lastId);
}

async function bumpLastIdAndGet(env: Env): Promise<number> {
    let afterBump = await getLastId(env) + 1
    await setLastId(afterBump, env)
    return afterBump
}

// 管理正在进行的赌局

async function addAvailableGambling(id: number, env: Env) {
    let ag = await getAvailableGamblings(env)
    ag.push(id)
    await putAvailableGamblings(ag, env)
}

async function removeAvailableGambling(id: number, env: Env) {
    let ag = await getAvailableGamblings(env)
    ag = ag.filter(x => x !== id)
    await putAvailableGamblings(ag, env)
}

// 管理下注

async function updateBetOnGambling(gambling: Gambling, bet: Bet, env: Env) {
    gambling.gamblers.push(bet)
    await putGambling(gambling, env)
}

//

function getStringAnswerForBet(gambling: Gambling, bet: Bet): string {
    if(bet.enumAnswerIndexForBet != null) {
        return gambling.enumAnswers![bet.enumAnswerIndexForBet]
    } else {
        return bet.answerForBet!
    }
}

//

async function tryCostUser(gamblerId: string, value: number, env: Env): Promise<boolean> {
    if(value < 0) throw new Error(`value should not be negative: ${value}`);

    let has = await getGamblerToken(gamblerId, env)
    if(has >= value) {
        await setGamblerToken(gamblerId, has - value, env)
        return true
    } else {
        return false
    }
}

async function tryRefundUser(gameblerId: string, value: number, env: Env): Promise<boolean> {
    if(value < 0) throw new Error(`value should not be negative: ${value}`);

    let has = await getGamblerToken(gameblerId, env)
    await setGamblerToken(gameblerId, has + value, env)
    return true
}

export {
    getAvailableGamblings,
    getGambling,
    putGambling,
    createNewGambling,
    isEnumAnswer,
    getEnumAnswer,
    getEnumAnswerIndexFor,
    destroyGambling,
    setLastId,
    getLastId,
    bumpLastIdAndGet,
    updateBetOnGambling,
    getStringAnswerForBet,
    tryCostUser,
    tryRefundUser
}