export type GameStatus = 'AVAILABLE' | 'SOON';
export interface GameCardData {
    id: string;
    title: string;
    description: string;
    image: string;
    xp: number;
    status: GameStatus;
    tag: string;
    color: string;
    colorDark: string;
    gameType?: string;
}
