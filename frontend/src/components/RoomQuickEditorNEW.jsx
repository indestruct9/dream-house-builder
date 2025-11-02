import React, { useState, useEffect } from 'react';

// Full-page mini-game: larger 2D preview, gallery of many items, and a cart.
// Self-contained: does not mutate application state.
export default function RoomQuickEditorNEW({ visible = true, onClose = () => {}, onSave = null }) {
  if (!visible) return null;

  // Catalog of available items for the gallery
  const CATALOG = [
    { key: 'sofa', label: 'Sofa', cat: 'Seating', icon: '🛋️', price: 299 },
    { key: 'armchair', label: 'Armchair', cat: 'Seating', icon: '🪑', price: 129 },
    { key: 'beanbag', label: 'Bean Bag', cat: 'Seating', icon: '🟣', price: 59 },
    { key: 'coffeetable', label: 'Coffee Table', cat: 'Tables', icon: '🪵', price: 149 },
    { key: 'sidetable', label: 'Side Table', cat: 'Tables', icon: '🪑', price: 79 },
    { key: 'bed', label: 'Bed', cat: 'Bedroom', icon: '🛏️', price: 399 },
    { key: 'nightstand', label: 'Nightstand', cat: 'Bedroom', icon: '🛋️', price: 89 },
    { key: 'rug', label: 'Rug', cat: 'Decor', icon: '🧶', price: 69 },
    { key: 'painting', label: 'Painting', cat: 'Decor', icon: '🖼️', price: 49 },
    { key: 'plant', label: 'Plant', cat: 'Decor', icon: '🪴', price: 39 },
    { key: 'tv', label: 'TV', cat: 'Electronics', icon: '📺', price: 499 },
    { key: 'lamp', label: 'Lamp', cat: 'Lighting', icon: '💡', price: 29 }
  ];

  const [roomType, setRoomType] = useState('Living Room');
  const [previewItems, setPreviewItems] = useState([]); // items placed inside the preview
  const [cart, setCart] = useState([]); // items queued to buy/add
  const [burst, setBurst] = useState(null);

  // Load persisted preview items for this room (demo persistence)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`rdh_quick_${roomType}`);
      if (raw) setPreviewItems(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, [roomType]);

  // Helper: random position inside preview
  const randomPos = () => ({ x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 70) + 15 });

  const addToCart = (catalogItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.key === catalogItem.key);
      if (existing) {
        return prev.map(p => p.key === catalogItem.key ? { ...p, qty: p.qty + 1 } : p);
      }
      return [{ ...catalogItem, qty: 1 }, ...prev];
    });
    setBurst({ emoji: '🛒' });
    setTimeout(() => setBurst(null), 600);
  };

  const removeFromCart = (key) => setCart(prev => prev.filter(i => i.key !== key));

  const addAllCartToRoom = () => {
    if (cart.length === 0) return;
    const created = [];
    cart.forEach(ci => {
      for (let i = 0; i < ci.qty; i++) {
        created.push({ id: `${ci.key}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, label: ci.label, cat: ci.cat, icon: ci.icon, pos: randomPos(), price: ci.price });
      }
    });
    setPreviewItems(prev => [...created, ...prev]);
    setCart([]);
    setBurst({ emoji: '✨' });
    setTimeout(() => setBurst(null), 700);
  };

  // Persist preview items to localStorage (demo) and optionally call parent's onSave
  const savePreviewToLocal = () => {
    try {
      localStorage.setItem(`rdh_quick_${roomType}`, JSON.stringify(previewItems));
      setBurst({ emoji: '💾' });
      setTimeout(() => setBurst(null), 700);
    } catch (e) {
      console.error('persist failed', e);
    }
  };

  const commitToApp = () => {
    // If parent passed an onSave callback, call it with the payload
    const payload = { roomType, items: previewItems };
    if (typeof onSave === 'function') {
      try {
        onSave(payload);
        setBurst({ emoji: '✅' });
        setTimeout(() => setBurst(null), 700);
      } catch (e) {
        console.error('onSave error', e);
      }
    } else {
      // fallback: persist locally and inform user
      savePreviewToLocal();
    }
  };


  const removePreviewItem = (id) => setPreviewItems(prev => prev.filter(i => i.id !== id));

  const resetAll = () => { setPreviewItems([]); setCart([]); setBurst(null); };

  const cartTotal = cart.reduce((s, it) => s + (it.price * it.qty), 0);

  const style = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(10,12,14,0.45)', zIndex: 4000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 20px', overflowY: 'auto' },
    container: { width: '100%', maxWidth: 1200, maxHeight: 'calc(100vh - 60px)', background: '#fff', borderRadius: 10, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 360px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' },
    left: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
    right: { padding: 20, borderLeft: '1px solid #eee', background: '#fafcff' },
    preview: { flex: 1, background: '#f1f6f9', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid #e6eef5' },
    gallery: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
    card: { padding: 8, borderRadius: 8, background: '#fff', border: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
    smallButton: { padding: '6px 8px', fontSize: 13 }
  };

  return (
    <div style={style.overlay}>
      <div style={style.container}>
        <div style={style.left}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Room Builder (Mini-Game)</div>
              <div style={{ fontSize: 13, color: '#556' }}>{roomType} • Place items, build a cozy layout</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ alignSelf: 'center', color: '#666' }}>Preview items: <strong>{previewItems.length}</strong></div>
              <button className="btn-soft" onClick={onClose}>Close</button>
              <button className="btn-soft" onClick={() => { savePreviewToLocal(); }} title="Save preview locally">Save</button>
            </div>
          </div>

          <div style={style.preview}>
            {/* background floor pattern */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div style={{ position: 'absolute', left: 12, top: 12, fontSize: 13, color: '#344' }}>{roomType}</div>

            {/* placed items */}
            {previewItems.map(it => (
              <div key={it.id} title={it.label} onDoubleClick={() => removePreviewItem(it.id)} style={{ position: 'absolute', left: `${it.pos.x}%`, top: `${it.pos.y}%`, transform: 'translate(-50%,-50%)', cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
                  <div style={{ fontSize: 26 }}>{it.icon}</div>
                </div>
                <div style={{ marginTop: 6, textAlign: 'center', fontSize: 12 }}>{it.label}</div>
              </div>
            ))}

            {/* hint */}
                {previewItems.length === 0 && (
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#789', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>Your room is empty</div>
                <div>Use the gallery to the right to add furniture, then click "Add to Cart".</div>
              </div>
            )}
          </div>

          {/* gallery */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Gallery</div>
              <div style={style.gallery}>
                {CATALOG.map(ci => (
                  <div key={ci.key} style={style.card}>
                    <div style={{ fontSize: 28 }}>{ci.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{ci.label}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{ci.cat} • ${ci.price}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="btn-soft" style={style.smallButton} onClick={() => addToCart(ci)}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={style.right}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Cart</div>
            <div style={{ fontSize: 13, color: '#555' }}>${cartTotal}</div>
          </div>

          {cart.length === 0 && <div style={{ color: '#777', marginBottom: 12 }}>Cart is empty. Add items from the gallery.</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflow: 'auto' }}>
            {cart.map(ci => (
              <div key={ci.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: '#fff', border: '1px solid #eef' }}>
                <div style={{ fontSize: 22 }}>{ci.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ci.label}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{ci.qty} × ${ci.price}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-soft" onClick={() => setCart(prev => prev.map(p => p.key === ci.key ? { ...p, qty: Math.max(1, p.qty - 1) } : p))}>-</button>
                  <button className="btn-soft" onClick={() => setCart(prev => prev.map(p => p.key === ci.key ? { ...p, qty: p.qty + 1 } : p))}>+</button>
                  <button className="btn-danger" onClick={() => removeFromCart(ci.key)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn-soft" onClick={resetAll}>Reset</button>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* 'Save to App Room' removed — feature disabled. Keep local save. */}
            <button className="btn-soft" style={{ width: '100%' }} onClick={savePreviewToLocal}>Save locally</button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>Tip: Double-click an item in the preview to remove it.</div>

          {burst && <div style={{ position: 'absolute', right: 36, top: 28, fontSize: 24 }}>{burst.emoji}</div>}
        </div>
      </div>
    </div>
  );
}
