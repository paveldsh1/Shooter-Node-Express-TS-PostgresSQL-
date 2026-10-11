export const PLAYER_PISTOL = [
	"!!!╔═╗!!!",
	"!!!║ ║!!!",
	"╭─╮║ ║!!!",
	"│ │╠═╣╭─╮",
	"│ ╰───╯ │",
	"│    ───╯",
	"│    ───╯",
	"╰╮  ╭──╯!",
]

export const PLAYER_PISTOL_SHOOT = [
	"!!!\\V/!!!",
	"!!!╔═╗!!!",
	"!!!║ ║!!!",
	"╭─╮║ ║!!!",
	"│ │╠═╣╭─╮",
	"│ ╰───╯ │",
	"│    ───╯",
	"│    ───╯",
]

export const PLAYER_SHOTGUN = [
	"!!!!!╔═╦═╗!!",
	"!!!!!║ ║ ║!!",
	"!!!!!║ ║ ║!!",
	"!!!!╭║ ║ ║╮!",
	"!!!!|║ ║ ║╮!",
	"!!!!|║ ║ ║╮!",
	"!!!/ ║ ║ ║─╮",
	"!!/  ╭─╮ ║ │",
	"!/  /│ ├─╯ │",
	"/  /!╰╮  ╭─╯",
]

export const PLAYER_SHOTGUN_SHOOT = [
	"!!!!\\\\V|V//!",
	"!!!!\\\\V|V//!",
	"!!!!!╔═╦═╗!!",
	"!!!!!║ ║ ║!!",
	"!!!!!║ ║ ║!!",
	"!!!!╭║ ║ ║╮!",
	"!!!!|║ ║ ║╮!",
	"!!!!|║ ║ ║╮!",
	"!!!/ ║ ║ ║─╮",
	"!!/  ╭─╮ ║ │",
	"!/  /│ ├─╯ │",
]

export type WeaponType = "pistol" | "shotgun"

export function getWeaponSprite(
	weapon: WeaponType,
	shooting: boolean,
): string[] {
	if (weapon === "shotgun") {
		return shooting ? PLAYER_SHOTGUN_SHOOT : PLAYER_SHOTGUN
	}

	return shooting ? PLAYER_PISTOL_SHOOT : PLAYER_PISTOL
}