import { getRepository, Repository } from "typeorm";
import { StudyNoteEntity } from "../entity/StudyNoteEntity";

export class ReviewService {

    readonly repo: Repository<StudyNoteEntity>;
    constructor() {
        this.repo = getRepository(StudyNoteEntity);
    }

    async reviewNow(relativePath: string) {

        const lastReviewed = new Date();
        
        const entity = await this.repo.findOne({ relativePath });

        if (entity) {
            entity.lastReviewed = lastReviewed;
            await this.repo.save(entity);
        } else {
           await this.repo.save({ relativePath, lastReviewed });
        }
    }
    async lastReviewed(relativePath: string): Promise<Date | undefined> {
        const entity = await this.repo.findOne(relativePath);
        if (entity) {
            return entity.lastReviewed;
        }
    }
}