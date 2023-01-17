import {
	InteractionResponseType,
	InteractionType,
	verifyKey,
} from "discord-interactions"
import { Router } from "itty-router"
import {
	BeginGambling,
	BetOnGambling,
	EndGambling,
	GetToken,
	GrantToken,
	HelloNaiji,
	ListGambling,
	registerCommandsGlobal,
	RevokeToken,
} from "./commands"
import { TokenUnit } from "./customize"
import {
	InteractionObject,
	numberValue,
	stringValue,
} from "./discord-definitions"
import {
	Bet,
	bumpLastIdAndGet,
	createNewGambling,
	destroyGambling,
	Gambling,
	getAvailableGamblings,
	getEnumAnswerIndexFor,
	getGambling,
	getStringAnswerForBet,
	isEnumAnswer,
	putGambling,
	tryCostUser,
	tryRefundUser,
	updateBetOnGambling,
} from "./gamble"
import { getGamblerToken, setGamblerToken } from "./gambler"

const router = Router()

router.get("/", (request, env) => {
	return new Response(`奶鸡${Math.random() > 0.5 ? "" : "不"}喜欢你！`)
})

router.post("/", async (request, env) => {
	const message: InteractionObject = await request.json()
	if (message.type == InteractionType.PING) {
		console.log("Ping-pong Event")
		return new JsonResponse({ type: InteractionResponseType.PONG })
	}

	if (message.type == InteractionType.APPLICATION_COMMAND) {
		const commandName: string = message.data?.name ?? "unknown"
		const uid = message.user?.id ?? message.member?.user?.id

		switch (commandName.toLowerCase()) {
			case HelloNaiji.name: {
				return new JsonResponse({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: "奶鸡BOT在哦",
					},
				})
			}

			case GetToken.name: {
				if (uid) {
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `你有${await getGamblerToken(
								uid,
								env
							)}${TokenUnit}的赌注`,
						},
					})
				} else {
					return new JsonResponse({
						type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `无法获取到你的用户信息`,
						},
					})
				}
			}

			case GrantToken.name: {
				let receiverId = message.data?.options?.find(
					(x) => x.name == "收赌注的用户"
				)?.value as string
				let receiveCount = (message.data?.options?.find(
					(x) => x.name == "赌注数量"
				)?.value ?? 0) as number

				if (receiverId) {
					let beforeGrant = await getGamblerToken(receiverId, env)
					await setGamblerToken(
						receiverId,
						beforeGrant + receiveCount,
						env
					)

					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "操作成功！",
						},
					})
				} else {
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "找不到收取赌注的用户",
						},
					})
				}
			}

			case RevokeToken.name: {
				let revokedId = message.data?.options?.find(
					(x) => x.name == "被收回的用户"
				)?.value as string
				let revokeCount = (message.data?.options?.find(
					(x) => x.name == "赌注数量"
				)?.value ?? 0) as number

				if (revokedId) {
					let beforeRevoke = await getGamblerToken(revokedId, env)
					await setGamblerToken(
						revokedId,
						beforeRevoke - revokeCount,
						env
					)

					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "操作成功！",
						},
					})
				} else {
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "找不到收回赌注的用户",
						},
					})
				}
			}

			case ListGambling.name: {
				let availableGamblingsIds: number[] =
					await getAvailableGamblings(env)
				if (availableGamblingsIds.length == 0) {
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "目前没有正在进行的赌局",
						},
					})
				} else {
					let message = "目前正在进行的赌局\n"
					message += "----------\n"
					for(let id of availableGamblingsIds) {
						let g = await getGambling(id, env)
						// 显示内容
						message += `${g.content}（${id}）\n`
						// 显示可选下注内容
						if (isEnumAnswer(g)) {
							message += `可选的下注内容有：${g.enumAnswers?.join(", ")}\n`
						}
						// 下注情况
						if (g.gamblers.length == 0) {
							message += "无人下注\n"
						} else {
							for (let b of g.gamblers) {
								message += `<@${b.gamblerId}> 在${getStringAnswerForBet(g, b)}上下注了${b.tokenOnBet}${TokenUnit}\n`
							}
						}
						message += "----------\n"
					}
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: message,
						},
					})
				}
			}

			case BeginGambling.name: {
				let subject = message.data?.options?.find(
					(x) => x.name == "主题"
				)?.value as string
				let useEnumValue = message.data?.options?.find(
					(x) => x.name == "固定选择"
				)?.value as boolean
				let enumValuesStr = message.data?.options?.find(
					(x) => x.name == "固定选择答案"
				)?.value as string

				let enumValues: string[] = []
				if (enumValuesStr)
					enumValues = enumValuesStr.split(";").map((x) => x.trim())

				let gambling: Gambling = useEnumValue
					? await createNewGambling(subject, env, enumValues)
					: await createNewGambling(subject, env)

				return new JsonResponse({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `成功创建主题为 ${subject} 的赌盘（${
							gambling.id
						}），下注模式为${useEnumValue ? "预设" : "自选"}`,
					},
				})
			}

			case EndGambling.name: {
				let gamblingId = message.data?.options?.find(
					(x) => x.name == "结束的赌局"
				)?.value as number
				let rightEnumAnswer = message.data?.options?.find(
					(x) => x.name == "固定选择正确的答案"
				)?.value

				let g: Gambling = await getGambling(gamblingId, env)

				if (g == null) {
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "找不到赌局",
						},
					})
				}

				if (isEnumAnswer(g)) {
					if (typeof rightEnumAnswer == "string") {
						await destroyGambling(g, env)

						let index = getEnumAnswerIndexFor(rightEnumAnswer, g)

						let winners = g.gamblers.filter(
							(x) => x.enumAnswerIndexForBet == index
						)
						if (winners.length > 0) {
							let message = `赌盘${g.content}结束，有${winners.length}位玩家获得胜利\n`

							let totalCost = g.gamblers.map(b => b.tokenOnBet).reduce((x, y) => x + y)
							let winnerCost = winners.map(b => b.tokenOnBet).reduce((x, y) => x + y)

							for(let b of winners) {
								let uid = b.gamblerId
								let reward = Math.floor((b.tokenOnBet / winnerCost) * totalCost)
								await tryRefundUser(uid, reward, env)
								message += `<@${uid}> 赢得${reward}${TokenUnit}`
							}

							// let winnersStr = winners.map(b => `<@${b.gamblerId}>`).join(" ")
							// return new JsonResponse({
							// 	type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							// 	data: {
							// 		content: `赌盘${g.content}结束，以下${winners.length}位玩家获得胜利\n${winnersStr}`,
							// 	},
							// })
							return discordText(message)
						} else {
							return new JsonResponse({
								type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
								data: {
									content: `赌盘${g.content}结束，无人获得胜利`,
								},
							})
						}
					} else {
						return new JsonResponse({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								content: "无效答案值，删除未执行",
							},
						})
					}
				} else {
					await destroyGambling(g, env)

					let message = `赌盘 ${g.content} 结束，共有${g.gamblers.length}位玩家参与`
					g.gamblers.forEach((bet: Bet) => {
						message += `\n<@${bet.gamblerId}>：${bet.answerForBet}`
					})

					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: message,
						},
					})
				}
			}

			case BetOnGambling.name: {
				let betTheGambling = numberValue(
					message.data?.options?.find((x) => x.name == "下注的赌局")
				)
				let betTheAnswer = stringValue(
					message.data?.options?.find((x) => x.name == "下注答案")
				)
				let betTheToken = numberValue(
					message.data?.options?.find((x) => x.name == "下注数量")
				)

				if (betTheGambling == null || betTheAnswer == null || betTheToken == null) {
					return discordText("缺少参数")
				}

				if (!uid) {
					return discordText("无法获取用户")
				}

				let g: Gambling = await getGambling(betTheGambling, env)
				if (g == null) {
					return discordText("找不到赌局")
				}

				let bet: Bet

				if (isEnumAnswer(g)) {
					let index = getEnumAnswerIndexFor(betTheAnswer, g)

					if (index == null || index < 0) {
						return discordText("无效的答案值")
					}

					if(!await tryCostUser(uid, betTheToken, env)) {
						return discordText("钱不够")
					}

					bet = {
						gamblerId: uid,
						tokenOnBet: betTheToken,
						enumAnswerIndexForBet: index,
					}
				} else {
					if(!await tryCostUser(uid, betTheToken, env)) {
						return discordText("钱不够")
					}

					bet = {
						gamblerId: uid,
						tokenOnBet: betTheToken,
						answerForBet: betTheAnswer,
					}
				}

				await updateBetOnGambling(g, bet, env)

				return discordText(
					`成功下注 ${g.content}（${g.id}）：${betTheAnswer} ${betTheToken}${TokenUnit}`
				)
			}

			default:
				console.warn(`Cannot handle the unknown command ${commandName}`)
				return new JsonResponse({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `欸，奶鸡暂时不支持这个指令！\n请把这段文字报告给TP吧！\n\n\`\`\`\n${JSON.stringify(
							message
						)}\n\`\`\``,
					},
				})
			// return new JsonResponse(
			// 	{
			// 		error: `Cannot handle the unknown command ${commandName}`,
			// 	},
			// 	{ status: 400 }
			// )
		}
	}

	console.warn(`Cannot handle the event with type ${message.type}`)
	return new JsonResponse(
		{ error: "Cannot handle the event!" },
		{ status: 400 }
	)
})

// 注册指令
router.get("/register-commands", async (request, env: Env) => {
	if (request.query["secret"] == "naijiji") {
		let r = await registerCommandsGlobal(env)
		if (r.ok) {
			return new Response(`好的，奶鸡知道了`)
		} else {
			return new Response("出问题了！")
		}
	} else {
		return new Response("奶鸡不在！")
	}
})

// 关于
router.get("/about", async (request, env: Env) => {
	return Response.redirect("https://github.com/Taskeren/naijibot")
})

router.all("*", (request, env) => {
	return new JsonResponse({ error: "Not Found" }, { status: 404 })
})

class JsonResponse extends Response {
	constructor(body: unknown, init?: ResponseInit) {
		const jsonBody = JSON.stringify(body)
		init = init || {
			headers: {
				"Content-Type": "application/json",
			},
		}
		super(jsonBody, init)
	}
}

function discordText(content: string) {
	return new JsonResponse({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content,
		},
	})
}

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	naiji_bot: KVNamespace

	DISCORD_TOKEN: string
	DISCORD_PUBLIC_KEY: string
	DISCORD_APPLICATION_ID: string
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		let validConfig = false

		// check configuration
		if (!env.DISCORD_TOKEN)
			console.error(
				`Private Configuration 'DISCORD_TOKEN' is not properly configured: ${env.DISCORD_TOKEN}`
			)
		else if (!env.DISCORD_PUBLIC_KEY)
			console.error(
				`Private Configuration 'DISCORD_PUBLIC_KEY' is not properly configured. ${env.DISCORD_PUBLIC_KEY}`
			)
		else if (!env.DISCORD_APPLICATION_ID)
			console.error(
				`Private Configuration 'DISCORD_APPLICATION_ID' is not properly configured. ${env.DISCORD_APPLICATION_ID}`
			)
		else validConfig = true

		if (!validConfig) {
			return new JsonResponse(
				{ error: "Naiji is not configured properly!" },
				{ status: 500 }
			)
		}

		if (request.method === "POST") {
			const signature = request.headers.get("x-signature-ed25519")!
			const timestamp = request.headers.get("x-signature-timestamp")!

			console.log(signature, timestamp)

			const body = await request.clone().arrayBuffer()
			const isValidRequest = verifyKey(
				body,
				signature,
				timestamp,
				env.DISCORD_PUBLIC_KEY
			)

			if (!isValidRequest) {
				console.error("Invalid request cannot pass the verify!")
				return new Response("Cannot verify the request!", {
					status: 401,
				})
			}
		}

		return router.handle(request, env)
	},
}
