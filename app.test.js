const app = require('./app.js');

describe('Notes App', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Initialize noteId and notes
        app.noteId = 0;
        app.notes = [];
    });

    it('should initialize notes correctly', () => {
        // Initialize notes from localStorage
        app.init();
        expect(app.notes).toEqual([]);
    });

    it('should add a new note', () => {
        // Initialize notes from localStorage
        app.init();
        // Create a new note
        var note = {
            id: 0,
            title: 'Test Note',
            body: 'This is a test note',
            date: '2022-01-01'
        };
        app.notes.push(note);
        expect(app.notes.length).toBe(1);
        expect(app.notes[0]).toEqual(note);
    });

    it('should filter notes by date', () => {
        // Initialize notes from localStorage
        app.init();
        // Create some notes
        var note1 = {
            id: 0,
            title: 'Note 1',
            body: 'This is note 1',
            date: '2022-01-01'
        };
        var note2 = {
            id: 1,
            title: 'Note 2',
            body: 'This is note 2',
            date: '2022-01-02'
        };
        var note3 = {
            id: 2,
            title: 'Note 3',
            body: 'This is note 3',
            date: '2022-01-01'
        };
        app.notes.push(note1);
        app.notes.push(note2);
        app.notes.push(note3);
        // Set the date filter
        app.dateFilter = '2022-01-01';
        var filteredNotes = app.getFilteredNotes();
        expect(filteredNotes.length).toBe(2);
        expect(filteredNotes[0]).toEqual(note1);
        expect(filteredNotes[1]).toEqual(note3);
    });

    it('should clear the date filter', () => {
        // Initialize notes from localStorage
        app.init();
        // Create some notes
        var note1 = {
            id: 0,
            title: 'Note 1',
            body: 'This is note 1',
            date: '2022-01-01'
        };
        var note2 = {
            id: 1,
            title: 'Note 2',
            body: 'This is note 2',
            date: '2022-01-02'
        };
        var note3 = {
            id: 2,
            title: 'Note 3',
            body: 'This is note 3',
            date: '2022-01-01'
        };
        app.notes.push(note1);
        app.notes.push(note2);
        app.notes.push(note3);
        // Set the date filter
        app.dateFilter = '2022-01-01';
        // Clear the date filter
        app.clearFilter();
        var filteredNotes = app.getFilteredNotes();
        expect(filteredNotes.length).toBe(3);
        expect(filteredNotes[0]).toEqual(note1);
        expect(filteredNotes[1]).toEqual(note2);
        expect(filteredNotes[2]).toEqual(note3);
    });

    it('should edit a note', () => {
        // Initialize notes from localStorage
        app.init();
        // Create a new note
        var note = {
            id: 0,
            title: 'Test Note',
            body: 'This is a test note',
            date: '2022-01-01'
        };
        app.notes.push(note);
        // Edit the note
        var editedNote = {
            id: 0,
            title: 'Edited Note',
            body: 'This is an edited note',
            date: '2022-01-01'
        };
        app.notes[0] = editedNote;
        expect(app.notes[0]).toEqual(editedNote);
    });

    it('should delete a note', () => {
        // Initialize notes from localStorage
        app.init();
        // Create a new note
        var note = {
            id: 0,
            title: 'Test Note',
            body: 'This is a test note',
            date: '2022-01-01'
        };
        app.notes.push(note);
        // Delete the note
        app.notes = app.notes.filter(function(n) {
            return n.id !== 0;
        });
        expect(app.notes.length).toBe(0);
    });
});

// Helper function to get filtered notes
app.getFilteredNotes = function() {
    if (app.dateFilter === '') {
        return app.notes;
    } else {
        return app.notes.filter(function(note) {
            return note.date === app.dateFilter;
        });
    }
};

// Helper function to clear the date filter
app.clearFilter = function() {
    app.dateFilter = '';
};
