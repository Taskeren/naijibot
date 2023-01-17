import { Env } from "."

export interface Command {
	name: string
	description: string
	type: number
	options?: CommandArgument[]
}

export interface CommandArgument {
	type: number
	name: string
	description: string
	required?: boolean
}

export enum CommandArgumentType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,
	NUMBER = 10,
	ATTACHMENT = 11,
}

export const HelloNaiji: Command = {
	name: "naiji",
	description: "你好，奶鸡在吗？",
	type: 1,
}

export const GetToken: Command = {
	name: "token",
	description: "问问奶鸡，我还有多少赌注",
	type: 1,
}

export const GrantToken: Command = {
	name: "grant-token",
	description: "奶鸡，给我发点赌注！",
	type: 1,
	options: [
		{
			type: CommandArgumentType.USER,
			name: "收赌注的用户",
			description: "给谁呢",
			required: true,
		},
		{
			type: CommandArgumentType.INTEGER,
			name: "赌注数量",
			description: "给多少呢",
			required: true,
		},
	],
}

export const RevokeToken: Command = {
	name: "revoke-token",
	description: "奶鸡觉得你不行，把你的赌注拿走了",
	type: 1,
	options: [
		{
			type: CommandArgumentType.USER,
			name: "被收回的用户",
			description: "拿谁呢",
			required: true,
		},
		{
			type: CommandArgumentType.INTEGER,
			name: "赌注数量",
			description: "拿多少呢",
			required: true,
		},
	],
}

export const ListGambling: Command = {
	name: "list-gambling",
	description: "奶鸡，你那里有在赌什么？",
	type: 1,
}

export const BeginGambling: Command = {
	name: "begin-gambling",
	description: "奶鸡，我要在你这里开一场",
	type: 1,
	options: [
		{
			type: CommandArgumentType.STRING,
			name: "主题",
			description: "这次赌局的主题是什么？",
			required: true,
		},
		{
			type: CommandArgumentType.BOOLEAN,
			name: "固定选择",
			description: "是否固定答案类型",
		},
		{
			type: CommandArgumentType.STRING,
			name: "固定选择答案",
			description: "固定选择的答案，使用';'隔开",
		},
	],
}

export const EndGambling: Command = {
	name: "end-gambling",
	description: "奶鸡，有结果了",
	type: 1,
	options: [
		{
			type: CommandArgumentType.INTEGER,
			name: "结束的赌局",
			description: "结束赌局ID",
			required: true,
		},
		{
			type: CommandArgumentType.STRING,
			name: "固定选择正确的答案",
			description: "固定选择正确的答案（只有开启固定选择答案时有用）",
		},
	],
}

export const BetOnGambling: Command = {
	name: "bet",
	description: "奶鸡，我来下注了",
	type: 1,
	options: [
		{
			type: CommandArgumentType.INTEGER,
			name: "下注的赌局",
			description: "下注赌局ID",
			required: true,
		},
		{
			type: CommandArgumentType.STRING,
			name: "下注答案",
			description: "下注的内容",
			required: true,
		},
		{
			type: CommandArgumentType.INTEGER,
			name: "下注数量",
			description: "下注赌注数量",
			required: true
		}
	],
}

export async function registerCommandsGlobal(env: Env) {
	const url = `https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/commands`
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bot ${env.DISCORD_TOKEN}`,
		},
		method: "PUT",
		body: JSON.stringify([
			HelloNaiji,
			GetToken,
			GrantToken,
			RevokeToken,
			ListGambling,
			BeginGambling,
			EndGambling,
            BetOnGambling
		]),
	})
	if (response.ok) {
		console.log("Registered all commands to global scope!")
	} else {
		const result = await response.json()
		console.error("Error occurred when registering commands", result)
	}

	return response
}
