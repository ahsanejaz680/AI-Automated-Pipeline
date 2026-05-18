// Get the functions from app
const app = require('./app');

// Mock the localStorage
const localStorageMock = (function() {
  const store = {};
  return {
    getItem: function(key) {
      return store[key];
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    },
  };
})();

const getNotesFromStorage = function() {
  return JSON.parse(localStorageMock.getItem('notes')) || [];
};

const saveNotesToStorage = function(notes) {
  localStorageMock.setItem('notes', JSON.stringify(notes));
};

const filterNotesByDate = function(dateFilter, notes) {
  if (dateFilter === '') {
    return notes;
  } else {
    return notes.filter(function(note) {
      return note.date === dateFilter;
    });
  }
};

const createNote = function(title, body, date) {
  return { title: title, body: body, date: date };
};

const addNote = function(notes, note) {
  notes.push(note);
  return notes;
};

const deleteNote = function(notes, index) {
  notes.splice(index, 1);
  return notes;
};

const editNote = function(notes, index, title, body) {
  notes[index].title = title;
  notes[index].body = body;
  return notes;
};

describe('Notes functions', function() {
  beforeEach(function() {
    // Clear the localStorage before each test
    localStorageMock.clear();
  });

  it('getNotesFromStorage should return an empty array if there are no notes', function() {
    expect(getNotesFromStorage()).toEqual([]);
  });

  it('saveNotesToStorage should save notes to localStorage', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }];
    saveNotesToStorage(notes);
    expect(JSON.parse(localStorageMock.getItem('notes'))).toEqual(notes);
  });

  it('filterNotesByDate should return all notes if no date filter is applied', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }, { title: 'Note 2', body: 'This is note 2', date: '2022-01-02' }];
    expect(filterNotesByDate('', notes)).toEqual(notes);
  });

  it('filterNotesByDate should return notes that match the date filter', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }, { title: 'Note 2', body: 'This is note 2', date: '2022-01-02' }];
    expect(filterNotesByDate('2022-01-01', notes)).toEqual([notes[0]]);
  });

  it('createNote should create a new note', function() {
    const note = createNote('Note 1', 'This is note 1', '2022-01-01');
    expect(note).toEqual({ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' });
  });

  it('addNote should add a note to the list of notes', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }];
    const newNote = { title: 'Note 2', body: 'This is note 2', date: '2022-01-02' };
    expect(addNote(notes, newNote)).toEqual([...notes, newNote]);
  });

  it('deleteNote should remove a note from the list of notes', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }, { title: 'Note 2', body: 'This is note 2', date: '2022-01-02' }];
    expect(deleteNote(notes, 0)).toEqual([notes[1]]);
  });

  it('editNote should edit a note in the list of notes', function() {
    const notes = [{ title: 'Note 1', body: 'This is note 1', date: '2022-01-01' }, { title: 'Note 2', body: 'This is note 2', date: '2022-01-02' }];
    expect(editNote(notes, 0, 'New Note 1', 'This is new note 1')).toEqual([{ title: 'New Note 1', body: 'This is new note 1', date: '2022-01-01' }, notes[1]]);
  });
});
