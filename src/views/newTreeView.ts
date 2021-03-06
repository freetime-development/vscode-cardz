import { TreeItem, TreeItemCollapsibleState, TreeDataProvider } from "vscode";
import { basename, join } from "path";
import { promises } from "fs";
import { StudyNoteEntity } from "../entity/StudyNoteEntity";
import { getRepository } from "typeorm";
import * as moment from 'moment';
import { getRelativePath } from "../util/pathUtils";
import { getFlashCards } from "../util/walk";

export class StudyNode extends TreeItem {
    contextValue = 'studyNode';

    constructor(
        public readonly directory: string,
        private readonly name?: string
    ) {
        super(name ? name : basename(directory), TreeItemCollapsibleState.Collapsed);
    }

    get tooltip(): string {
        return `${this.label}`;
    }

    get description(): string {
        return "";
    }

    static isStudyNote(arg: any): arg is StudyNode {
        return arg.directory !== undefined && arg.contextValue === 'studyNode';
    }
} 

export class LastReviewSet extends TreeItem {
    contextValue = 'reviewNotes';

    constructor(){
        super('Last reviewed', TreeItemCollapsibleState.Collapsed);
    }

    get tooltip(): string {
        return 'Last reviewed';
    }

    get description(): string {
        return "";
    }

    async children(rootPath: string): Promise<LastReviewItem[]> {
        const repo = getRepository(StudyNoteEntity);
        const items = await repo.find({});
        return items.map(item => new LastReviewItem(item, rootPath));
    }

    static isInstance(arg: any): arg is LastReviewSet {
        return arg.contextValue === 'reviewNotes';
    }
}

export class LastReviewItem extends TreeItem {
    contextValue = 'reviewItem';

    constructor(
        private readonly entity: StudyNoteEntity,
        readonly rootPath: string
        ) {
        super(basename(entity.relativePath));
        this.command = {
            command: "studyNotes.openFile",
            title: `Open: ${basename(entity.relativePath)}`,
            arguments: [join(rootPath, entity.relativePath)],
        };
    }

    get description(): string {
        return `Last review: ${moment(this.entity.lastReviewed).format("YYYY-MM-DD")}`;
    }
}
export class StudyItem extends TreeItem {


    constructor(
        public readonly location: string,
        private numOfFlashCards: number,
        private readonly entity?: StudyNoteEntity,
    ) {
        super(
            basename(location),
            TreeItemCollapsibleState.None
        );

        this.command = {
            command: "studyNotes.openFile",
            title: `Open: ${basename(location)}`,
            arguments: [location]
        };

        this.contextValue = 'studyItem';
    }
    static isInstance(arg: any): arg is StudyItem {
        return arg.contextValue === 'studyItem';
    }

    get description(): string {
        const lastReview = this.entity ? `Last review: ${moment(this.entity.lastReviewed).format("YYYY-MM-DD")}` : "Never reviewed";
        return `${lastReview}, has: ${this.numOfFlashCards} cards`; 
    }
}

type StudyElements = StudyNode | StudyItem | LastReviewSet | LastReviewItem;

export class StudyItemsProvider implements TreeDataProvider<StudyElements> {
    private readonly repo = getRepository(StudyNoteEntity);
    constructor (
        private readonly rootFolder: string,
        private readonly exlusionPatterns: RegExp[]
    ){}

    async getChildren(element?: StudyElements | undefined): Promise<StudyElements[]> {
        if(element) {
            if(StudyNode.isStudyNote(element)) {
                return this.elements(element.directory);
            } 
            if(StudyItem.isInstance(element)) {
                return [element];
            } 
            if(LastReviewSet.isInstance(element)) {
                return element.children(this.rootFolder);
            }
            return [];
        } else {
            return [new StudyNode(this.rootFolder, 'Notes'), new LastReviewSet()];
        }
    }

    private validPath(localPath: string): boolean {
		for (const e of this.exlusionPatterns) {
			if (localPath.match(e)) {
				return false;
			}
		}
		return true;
    }


	private async listChildren(localPath: string): Promise<string[]> {
		const paths = await promises.readdir(localPath);

		return paths.filter(p => this.validPath(p)).map(p => join(localPath, p));
    }

    private async elements(directory: string): Promise<StudyElements[]> {
        const res: StudyElements[] = [];
        for (const childPath of await this.listChildren(directory)) {
            if ((await this.isDirectory(childPath))) {
                res.push(new StudyNode(childPath));
            } else {
                const [entry, flashCards] = await Promise.all([
                    this.repo.findOne({relativePath: getRelativePath(childPath)}),
                    getFlashCards(childPath)
                ]);
        
                res.push(new StudyItem(childPath, flashCards.length, entry));
            }
        }

        return res;
    }

    private async isDirectory(localPath: string): Promise<boolean> {
        try {
            return (await promises.stat(localPath)).isDirectory();
        } catch (e) {
            return false;
        }
    }
    
    getTreeItem(element: StudyElements): TreeItem | Thenable<TreeItem>  {
        return element;
    }
}