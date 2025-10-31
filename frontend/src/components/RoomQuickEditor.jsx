import React, { useState } from 'react';

// Self-contained mini-game UI for the "Edit Room" button.
// Intentionally does NOT read or write any outer app state. It's a playful, local-only panel.
export default function RoomQuickEditor({ visible, onClose }) {
  if (!visible) return null;

  const DEFAULT_ITEMS = {
    Seating: ['Sofa', 'Armchair', 'Bean Bag'],
    Tables: ['Coffee Table', 'Side Table'],
    Bedroom: ['Bed', 'Nightstand'],
    Decor: ['Rug', 'Painting', 'Plant']
  };

  const [roomType, setRoomType] = useState('Living Room');
  const [gameItems, setGameItems] = useState([]);
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState(null);

  const addRandomItem = () => {
    const cats = Object.keys(DEFAULT_ITEMS);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const list = DEFAULT_ITEMS[cat];
    const pick = list[Math.floor(Math.random() * list.length)];
    const id = `${pick.replace(/\s+/g, '_')}_${Date.now()}`;
    const newItem = { id, label: pick, cat, born: Date.now() };
    setGameItems(prev => [newItem, ...prev]);
    setScore(s => s + 10);
    setBurst({ emoji: ['🎉','✨','🎈'][Math.floor(Math.random()*3)], id });
    setTimeout(() => setBurst(null), 800);
  };

  const removeItem = (id) => {
    setGameItems(prev => prev.filter(i => i.id !== id));
    setScore(s => Math.max(0, s - 5));
  };

  const resetGame = () => { setGameItems([]); setScore(0); setBurst(null); };

  const style = {
    panel: { position: 'fixed', right: 20, top: 80, width: 340, background: '#fff', padding: 14, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)', zIndex: 3000 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    itemCard: { padding: '8px 10px', borderRadius: 8, background: '#fafafa', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  };

  return (
    <div style={style.panel}>
      <div style={style.header}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Quick Room Game</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ alignSelf: 'center', color: '#666' }}>Score: <strong>{score}</strong></div>
          <button onClick={onClose} className="btn-soft">Close</button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Pick a room type (cosmetic):</label>
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={{ width: '100%', padding: 8 }}>
          <option>Living Room</option>
          <option>Bedroom</option>
          <option>Kitchen</option>
          <option>Bathroom</option>
          <option>Office</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="btn-coffee" onClick={addRandomItem} style={{ flex: 1 }}>Add Random Item</button>
        <button className="btn-soft" onClick={resetGame}>Reset</button>
      </div>

      <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>Decorations you added in this mini-game:</div>
      <div style={{ maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
        {gameItems.length === 0 && <div style={{ color: '#888' }}>No items yet — click "Add Random Item" to populate the room.</div>}
        <div style={{ display: 'grid', gap: 8 }}>
          {gameItems.map(it => (
            <div key={it.id} style={style.itemCard}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{roomType} • {it.cat}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-soft" onClick={() => removeItem(it.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {burst && (
        <div style={{ position: 'absolute', right: 36, top: 48, pointerEvents: 'none', fontSize: 22 }}>{burst.emoji}</div>
      )}
    </div>
  );
}
  