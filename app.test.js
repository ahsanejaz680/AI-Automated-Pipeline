const { JSDOM } = require('jsdom');
const { document } = new JSDOM().window;
const { jest } = require('jest');

// Mock window and document properties
global.window = document.defaultView;
global.document = document;
global.navigator = {
  userAgent: 'node-jsdom',
};

// Import the app.js file
const app = require('./app.js');

// Mock DOM elements
const elementMock = (element) => {
  const elements = [];
  document.addEventListener('DOMContentLoaded', () => {
    elements.push(element);
  });
  return jest.spyOn(document, 'createElement').mockResolvedValue(element);
};

Object.defineProperty(global.document, 'getElementById', {
  value: (id) => {
    switch (id) {
      case 'note-list':
        return elementMock(document.createElement('div'));
      case 'note-count':
        return elementMock(document.createElement('div'));
      case 'date-filter':
        return elementMock(document.createElement('input'));
      case 'note-form':
        return elementMock(document.createElement('form'));
      case 'note-title':
        return elementMock(document.createElement('input'));
      case 'note-body':
        return elementMock(document.createElement('textarea'));
      default:
        return null;
    }
  },
});

describe('Simple Notes App', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(global.window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReset(),
        setItem: jest.fn().mockReset(),
      },
    });

    // Initialize the note list and count
    const noteList = document.getElementById('note-list');
    noteList.innerHTML = '';
    document.getElementById('note-count').textContent = 'Notes: 0';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize the note list', async () => {
    const loadNotesMock = jest
      .spyOn(app, 'loadNotes')
      .mockResolvedValueOnce();
    await app.loadNotes();
    expect(loadNotesMock).toHaveBeenCalledTimes(1);
  });

  it('should add a new note to the list', async () => {
    const addNoteMock = jest.spyOn(app, 'addNote').mockResolvedValueOnce();
    await app.addNote();
    expect(addNoteMock).toHaveBeenCalledTimes(1);
  });

  it('should save a new note to local storage', async () => {
    const saveNoteMock = jest.spyOn(app, 'saveNote').mockResolvedValueOnce();
    document.getElementById('note-title').value = 'Test title';
    document.getElementById('note-body').value = 'Test body';
    await app.saveNote();
    expect(saveNoteMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem).toHaveBeenCalledTimes(2);
  });

  it('should load notes from local storage', async () => {
    const storedNotes = [
      { id: 0, title: 'Note title', body: 'Note body', date: '2022-01-01', edited: false },
    ];
    localStorage.setItem(app.NOTES_KEY, JSON.stringify(storedNotes));
    const loadNotesMock = jest.spyOn(app, 'loadNotes').mockResolvedValueOnce();
    await app.loadNotes();
    expect(loadNotesMock).toHaveBeenCalledTimes(1);
    expect(document.getElementById('note-list').children.length).toBe(1);
  });

  it('should delete a note', async () => {
    const storedNotes = [
      { id: 0, title: 'Note title', body: 'Note body', date: '2022-01-01', edited: false },
    ];
    const saveMock = jest.spyOn(localStorage, 'setItem').mockResolvedValueOnce();
    const deleteMock = jest.spyOn(app, 'deleteNote');
    localStorage.setItem(app.NOTES_KEY, JSON.stringify(storedNotes));
    document.getElementById('note-list').children[0].remove();
    await app.deleteNote(0);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('should display the total number of notes', async () => {
    const storedNotes = [
      { id: 0, title: 'Note title', body: 'Note body', date: '2022-01-01', edited: false },
    ];
    const saveMock = jest.spyOn(localStorage, 'setItem').mockResolvedValueOnce();
    localStorage.setItem(app.NOTES_KEY, JSON.stringify(storedNotes));
    await app.loadNotes();
    expect(document.getElementById('note-count').textContent).toBe('Notes: 1');
  });
});

// Helper function to get elements by class name
const getElementsByClassName = (className) => {
  const elements = [];
  document.addEventListener('DOMContentLoaded', () => {
    const elementChildren = document.querySelector(`.${className}`).children;
    Array.prototype.forEach.call(elementChildren, (element) => {
      elements.push(element);
    });
  });
  return jest.spyOn(document, 'getElementsByClassName').mockResolvedValue(elements);
};
