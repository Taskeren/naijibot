export function getStringValue(value: string | number): string {
    if(typeof value != "string") {
        return value.toString()
    } else {
        return value
    }
}

export function getStringValueNullable(value: string | number | null): string | null {
    if(value == null) {
        return null
    } else if(typeof value != "string") {
        return value.toString()
    } else {
        return value
    }
}