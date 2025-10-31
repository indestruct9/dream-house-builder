// RoomFurnitureEditor.jsx
import React from 'react';
import { useState } from 'react';

const styles = {
  editorPanel: {
    position: 'absolute',
    right: '20px',
    top: '20px',
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '250px',
    zIndex: 1000
  },
  button: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '5px'
  },
  categoryButton: (selected) => ({
    background: selected ? '#45a049' : '#808080',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '5px',
    width: 'calc(50% - 10px)'
  }),
  furnitureItem: {
    padding: '10px',
    margin: '5px 0',
    background: '#f5f5f5',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px'
  },
  title: {
    margin: 0
  },
  categoryContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px'
  }
};

const FURNITURE_CATEGORIES = {
  seating: ['Sofa', 'Chair', 'Armchair'],
  tables: ['Coffee Table', 'Dining Table', 'Side Table'],
  bedroom: ['Bed', 'Dresser', 'Nightstand'],
  decor: ['Rug', 'Painting', 'Plant']
};

const RoomFurnitureEditor = ({ isOpen, onClose, onAddFurniture, selectedRoom }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  if (!isOpen) return null;

  return (
    <div style={styles.editorPanel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Edit Room: {selectedRoom}</h3>
        <button style={styles.button} onClick={onClose}>×</button>
      </div>

      <div style={styles.categoryContainer}>
        {Object.keys(FURNITURE_CATEGORIES).map(category => (
          <button
            key={category}
            style={styles.categoryButton(selectedCategory === category)}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div>
          {FURNITURE_CATEGORIES[selectedCategory].map(item => (
            <div
              key={item}
              style={styles.furnitureItem}
              onClick={() => onAddFurniture(selectedCategory, item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomFurnitureEditor;