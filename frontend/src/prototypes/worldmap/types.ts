export type LevelStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
export interface Position {
    x: number;
    y: number;
}
export interface Level {
    id: number;
    name: string;
    description: string;
    difficulty: string;
    status: LevelStatus;
    position: Position;
}
export interface Biome {
    id: string;
    name: string;
    subtitle: string;
    color: string;
    accent: string;
    hotspot: Position;
    region?: Position[];
    levels: Level[];
}
