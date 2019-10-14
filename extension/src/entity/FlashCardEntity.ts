import {Entity, PrimaryColumn, Column} from "typeorm";

@Entity()
export class FlashCardEntity {

    constructor(id: string, relativePath: string) {
        this.id = id;
        this.relativePath = relativePath;
    }

    @PrimaryColumn()
    id: string;

    @Column()
    relativePath: string;
}