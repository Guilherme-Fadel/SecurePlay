import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Challenge } from "../challenge/challenge.entity";


@Entity()
export class Question {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Challenge)
    @JoinColumn({ name: 'challenge_id' })
    challenge: Challenge;

    @Column()
    challenge_id: number;

    @Column({ length: 500 })
    text: string;

    @Column('json')
    options: string[];

    @Column()
    correct_index: number;

    @Column({ nullable: true, length: 500 })
    explanation: string;

    @Column({ default: 0 })
    order: number;


}