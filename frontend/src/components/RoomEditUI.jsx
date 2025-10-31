import React, { useState } from 'react';

const RoomEditUI = ({ isVisible, selectedRoom, onAddFurniture }) => {
  const [selectedCategory, setSelectedCategory] = useState('living');

  if (!isVisible) return null;

  const style = {
    container: {
      position: 'absolute',
      right: '20px',
      top: '80px', // Below the dashboard button
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      width: '250px',
      zIndex: 1000
    },
    select: {
      width: '100%',
      padding: '8px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid #ccc'
    },
    button: {
      display: 'block',
      width: '100%',
      padding: '8px',
      margin: '5px 0',
      background: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      textAlign: 'left'
    },
    header: {
      margin: '0 0 15px 0',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={style.container}>
      <h3 style={style.header}>Edit Room{selectedRoom ? `: ${selectedRoom}` : ''}</h3>
      <select 
        value={selectedCategory} 
        onChange={(e) => setSelectedCategory(e.target.value)}
        style={style.select}
      >
        <option value="living">Living Room</option>
        <option value="bedroom">Bedroom</option>
        <option value="kitchen">Kitchen</option>
        <option value="bathroom">Bathroom</option>
        <option value="office">Office</option>
      </select>
      <div>
        {FURNITURE_ITEMS[selectedCategory].map(item => (
          <button
            key={item}
            style={style.button}
            onClick={() => onAddFurniture(selectedCategory, item)}
          >
            Add {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoomEditUI;