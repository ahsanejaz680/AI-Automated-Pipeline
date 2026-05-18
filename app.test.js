const app = require('./app.js');

describe('app', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <h1>Simple Notes App</h1>
            <form id="note-form">
                <input type="text" id="title" placeholder="Note title">
                <textarea id="body" placeholder="Note body"></textarea>
                <button id="add-note">Add Note</button>
            </form>
            <p id="note-count">Notes: <span id="count">0</span></p>
            <input type="date" id="date-filter" value="none">
            <button id="clear-filter">Clear Filter</button>
            <div id="notes-container"></div>
        `;
        app.notes = [];
        app.addNoteButton = document.getElementById('add-note');
        app.titleInput = document.getElementById('title');
        app.bodyInput = document.getElementById('body');
        app.dateFilterInput = document.getElementById('date-filter');
        app.notesContainer = document.getElementById('notes-container');
        app.noteCountSpan = document.getElementById('count');
    });

    it('should initialize notes as an empty array if none exist in storage', () => {
        expect(app.notes).toEqual([]);
    });

    it('should add a new note when the add button is clicked', () => {
        const title = 'Test Note';
        const body = 'This is a test note';
        app.titleInput.value = title;
        app.bodyInput.value = body;
        app.addNoteButton.click();
        expect(app.notes.length).toBe(1);
        expect(app.notes[0].title).toBe(title);
        expect(app.notes[0].body).toBe(body);
    });

    it('should render notes after adding a new note', () => {
        const title = 'Test Note';
        const body = 'This is a test note';
        app.titleInput.value = title;
        app.bodyInput.value = body;
        app.addNoteButton.click();
        expect(app.notesContainer.innerHTML).not.toBe('');
    });

    it('should filter notes by date when the date filter input is changed', () => {
        const title = 'Test Note';
        const body = 'This is a test note';
        app.titleInput.value = title;
        app.bodyInput.value = body;
        app.addNoteButton.click();
        const date = (new Date()).toISOString().split('T')[0];
        app.dateFilterInput.value = date;
        expect(app.notesContainer.innerHTML).not.toBe('');
    });

    it('should clear filter when the clear filter button is clicked', () => {
        const title = 'Test Note';
        const body = 'This is a test note';
        app.titleInput.value = title;
        app.bodyInput.value = body;
        app.addNoteButton.click();
        const date = (new Date()).toISOString().split('T')[0];
        app.dateFilterInput.value = date;
        app.dateFilterInput.value = 'none';
        expect(app.dateFilterInput.value).toBe('none');
    });
});
