const app = require('./app');

describe('Notes app functionality', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="notes"></div>
            <div id="note-count"></div>
            <input id="date-filter" type="text">
            <button id="clear-date-filter">Clear date filter</button>
            <button id="add-note">Add note</button>
            <input id="title" type="text" placeholder="Title">
            <textarea id="body" placeholder="Body"></textarea>
        `;
    });

    it('should render empty notes list when there are no notes', () => {
        app.init();
        const notesElement = document.getElementById('notes');
        expect(notesElement.innerHTML).toBe('');
    });

    it('should add a new note', () => {
        const titleInput = document.getElementById('title');
        const bodyTextarea = document.getElementById('body');
        const addNoteButton = document.getElementById('add-note');
        titleInput.value = 'Test title';
        bodyTextarea.value = 'Test body';
        addNoteButton.click();
        const notesElement = document.getElementById('notes');
        expect(notesElement.children.length).toBe(1);
    });

    it('should clear date filter', () => {
        const dateFilterElement = document.getElementById('date-filter');
        dateFilterElement.value = '2022-01-01';
        const clearDateFilterButton = document.getElementById('clear-date-filter');
        clearDateFilterButton.click();
        expect(dateFilterElement.value).toBe('');
    });
});
