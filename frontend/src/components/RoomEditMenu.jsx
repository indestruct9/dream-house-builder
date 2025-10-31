const RoomEditMenu = ({ show, selectedRoom, onAddFurniture }) => {
  if (!show) return null;

  const style = {
    container: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000
    },
    title: {
      margin: '0 0 10px 0',
      fontSize: '16px',
      fontWeight: 'bold'
    },
    section: {
      marginBottom: '10px'
    },
    button: {
      background: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      marginRight: '8px',
      marginBottom: '8px',
      cursor: 'pointer'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px'
    }
  };

  const categories = {
    'Living Room': ['Sofa', 'Coffee Table', 'TV Stand', 'Chair', 'Rug'],
    'Bedroom': ['Bed', 'Wardrobe', 'Nightstand', 'Dresser'],
    'Kitchen': ['Counter', 'Dining Table', 'Chairs', 'Cabinet'],
    'Office': ['Desk', 'Office Chair', 'Bookshelf', 'Filing Cabinet'],
    'Decor': ['Plant', 'Painting', 'Lamp', 'Mirror']
  };

  return (
    <div style={style.container}>
      <h3 style={style.title}>Room Editor: {selectedRoom || 'No Room Selected'}</h3>
      {selectedRoom && Object.entries(categories).map(([category, items]) => (
        <div key={category} style={style.section}>
          <h4 style={{ margin: '10px 0' }}>{category}</h4>
          <div style={style.grid}>
            {items.map(item => (
              <button
                key={item}
                style={style.button}
                onClick={() => {
                  // call handler passed from parent
                  onAddFurniture && onAddFurniture(selectedRoom, item);
                }}
              >
                Add {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoomEditMenu;