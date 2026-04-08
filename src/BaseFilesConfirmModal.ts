import { App, Modal } from 'obsidian';

export type BaseFilesChoice = 'skip' | 'overwrite' | 'cancel';

/**
 * Shown when "Create base files" is clicked and some target files already exist.
 * Resolves `result` with the user's choice once they interact with the modal.
 */
export class BaseFilesConfirmModal extends Modal {
    private resolveChoice!: (choice: BaseFilesChoice) => void;
    readonly result: Promise<BaseFilesChoice>;

    constructor(
        app: App,
        private readonly createCount: number,
        private readonly overwriteCount: number,
    ) {
        super(app);
        this.result = new Promise(resolve => {
            this.resolveChoice = resolve;
        });
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('p', {
            text: `${this.createCount} base file(s) will be created. `
                + `${this.overwriteCount} already exist(s).`,
        });

        const btnRow = contentEl.createDiv({ cls: 'entity-notes-modal-buttons' });

        const skipBtn = btnRow.createEl('button', { text: 'Skip existing' });
        skipBtn.addEventListener('click', () => {
            this.resolveChoice('skip');
            this.close();
        });

        const overwriteBtn = btnRow.createEl('button', { text: 'Overwrite all' });
        overwriteBtn.addEventListener('click', () => {
            this.resolveChoice('overwrite');
            this.close();
        });

        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            this.resolveChoice('cancel');
            this.close();
        });
    }

    onClose(): void {
        // Resolve as cancel if the modal is dismissed without clicking a button (e.g. Escape)
        this.resolveChoice('cancel');
        this.contentEl.empty();
    }
}
