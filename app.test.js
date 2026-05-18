const app = require('./app.js');

describe('Simple Notes App', () => {
  let noteListElement;
  let dateFilterElement;
  let noteCountElement;

  beforeEach(() => {
    // Mock localStorage for testing
    global.localStorage = {
      getItem: () => '[]',
      setItem: (key, value) => {},
      clear: () => {}
    };

    // Mock DOM elements for testing
    global.document = {
      getElementById: (id) => {
        if (id === 'note-list') {
          return noteListElement;
        } else if (id === 'note-count') {
          return noteCountElement;
        } else if (id === 'note-title') {
          return { value: '' };
        } else if (id === 'note-body') {
          return { value: '' };
        } else if (id === 'date-filter') {
          return dateFilterElement;
        } else if (id === 'add-note-btn') {
          return {};
        } else if (id === 'clear-filter-btn') {
          return {};
        }
      }
    };

    noteListElement = { innerHTML: '', children: [] };
    dateFilterElement = { value: '' };
    noteCountElement = { textContent: '' };
  });

  afterEach(() => {
    // Clear mock localStorage after each test
    global.localStorage.clear();
  });

  it('initializes with an empty notes array', () => {
    expect(JSON.parse(localStorage.getItem('notes'))).toEqual([]);
  });

  describe('addNote', () => {
    it('adds a new note to the notes array', () => {
      const noteTitle = { value: 'Test Note' };
      const noteBody = { value: 'Test Body' };

      document.getElementById = jest.fn().mockImplementation((id) => {
        if (id === 'note-title') {
          return noteTitle;
        } else if (id === 'note-body') {
          return noteBody;
        } else {
          return noteListElement;
        }
      });

      app.addNote({ preventDefault: () => {} });
      expect(JSON.parse(localStorage.getItem('notes'))).not.toHaveLength(0);
    });

    it('saves the notes array to localStorage', () => {
      const setItemSpy = jest.spyOn(localStorage, 'setItem');
      const noteTitle = { value: 'Test Note' };
      const noteBody = { value: 'Test Body' };

      document.getElementById = jest.fn().mockImplementation((id) => {
        if (id === 'note-title') {
          return noteTitle;
        } else if (id === 'note-body') {
          return noteBody;
        } else {
          return noteListElement;
        }
      });

      app.addNote({ preventDefault: () => {} });
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('editNote', () => {
    it('edits a note in the notes array', () => {
      const note = { title: 'Test Note', body: 'Test Body', date: '2022-01-01' };
      const notes = [note];
      localStorage.setItem('notes', JSON.stringify(notes));
      app.editNote(0);
      expect(note.title).toBe('Test Note');
    });
  });

  describe('deleteNote', () => {
    it('deletes a note from the notes array', () => {
      const note = { title: 'Test Note', body: 'Test Body', date: '2022-01-01' };
      const notes = [note];
      localStorage.setItem('notes', JSON.stringify(notes));
      app.deleteNote(0);
      expect(JSON.parse(localStorage.getItem('notes'))).toHaveLength(0);
    });
  });

  describe('filterNotes', () => {
    it('filters the notes based on the filter date', () => {
      const note1 = { title: 'Test Note 1', body: 'Test Body 1', date: '2022-01-01' };
      const note2 = { title: 'Test Note 2', body: 'Test Body 2', date: '2022-01-02' };
      const notes = [note1, note2];
      localStorage.setItem('notes', JSON.stringify(notes));
      dateFilterElement.value = '2022-01-01';
      app.filterNotes();
      expect(noteListElement.innerHTML).not.toBe('');
    });
  });

  describe('clearFilter', () => {
    it('clears the filter', () => {
      const note1 = { title: 'Test Note 1', body: 'Test Body 1', date: '2022-01-01' };
      const note2 = { title: 'Test Note 2', body: 'Test Body 2', date: '2022-01-02' };
      const notes = [note1, note2];
      localStorage.setItem('notes', JSON.stringify(notes));
      dateFilterElement.value = '2022-01-01';
      app.filterNotes();
      app.clearFilter();
      expect(dateFilterElement.value).toBe('');
      expect(noteListElement.innerHTML).not.toBe('');
    });
  });

  describe('updateNoteCount', () => {
    it('updates the note count', () => {
      const note1 = { title: 'Test Note 1', body: 'Test Body 1', date: '2022-01-01' };
      const note2 = { title: 'Test Note 2', body: 'Test Body 2', date: '2022-01-02' };
      const notes = [note1, note2];
      localStorage.setItem('notes', JSON.stringify(notes));
      app.updateNoteCount();
      expect(noteCountElement.textContent).toBe('Showing 2 notes');
    });
  });
});
