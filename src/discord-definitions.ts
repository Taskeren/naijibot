import { InteractionType } from "discord-interactions"

export interface User {
	id: string
	username: string
	discriminator: string
	avatar?: string
	bot?: boolean
}

export interface Member {
	user?: User
	nick?: string
	avatar?: string
}

export interface Message {
	id: string
	channel_id: string
	author: User
	content: string
	timestamp: string
	edited_timestamp: string
	tts: boolean
	mention_everyone: boolean
	mentions: User[]
	mention_roles: unknown[]
	mention_channels?: unknown[]
	attachments: unknown[]
	embeds: unknown[]
	reactions?: unknown[]
	nonce?: string | number
	pinned: boolean
	webhook_id?: string
	type: number
	activity?: unknown
	application?: unknown
	application_id?: unknown
	message_reference?: unknown
	flags: number
	referenced_message?: unknown
	interaction?: unknown
	thread?: unknown
	components?: unknown[]
	sticker_items?: unknown[]
	stickers: unknown[]
	position?: number
}

export interface CommandArgumentValue {
	name: string
	type: number
	value?: string | number | boolean
	options?: CommandArgumentValue[]
	focused?: boolean
}

export function stringValue(v: CommandArgumentValue | undefined): string | null {
	return v?.value == null ? null : v.value.toString()
}

export function numberValue(v: CommandArgumentValue | undefined): number | null {
	return v?.value == null ? null : typeof v.value == "number" ? v.value : Number.parseInt(v.value.toString())
}


export interface InteractionObject {
    id: string
    application_id: string
    type: InteractionType
    data?: {
        id: string
        name: string
        type: number
        resolved?: {
            users?: { [key: string]: User }
            members?: { [key: string]: User }
            roles: unknown
            channels: unknown
            messages: unknown
            attachments: unknown
        }
        options?: CommandArgumentValue[]
        guild_id: string
        target_id: string
    }
    guild_id?: string
    channel_id?: string
    member?: Member
    user?: User
    token: string
    version: number
    message?: Message
    app_permissions?: string
    locale?: string
    guild_locale?: string
}